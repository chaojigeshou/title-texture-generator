/* GIF89a 编码器（GIFEncoder）— LZW + 中位切分量化 + 透明索引
 * 独立模块：只依赖 Uint8Array，可在浏览器与 Node 中直接使用。
 * 码宽切换点按「解码器落后编码器一条表项（KwKwK）」对齐，已用 PIL / 浏览器逐像素校验。
 */
window.GIFEncoder = (function(){

  function Writer(){
    this.b = new Uint8Array(1 << 16);
    this.n = 0;
  }
  Writer.prototype.reserve = function(k){
    if (this.n + k <= this.b.length) return;
    var cap = this.b.length;
    while (cap < this.n + k) cap *= 2;
    var nb = new Uint8Array(cap);
    nb.set(this.b.subarray(0, this.n));
    this.b = nb;
  };
  Writer.prototype.u8 = function(v){ this.reserve(1); this.b[this.n++] = v & 255; };
  Writer.prototype.blob = function(a){ this.reserve(a.length); this.b.set(a, this.n); this.n += a.length; };
  Writer.prototype.u16 = function(v){
    this.reserve(2);
    this.b[this.n++] = v & 255;
    this.b[this.n++] = (v >> 8) & 255;
  };
  Writer.prototype.ascii = function(s){
    this.reserve(s.length);
    for (var i = 0; i < s.length; i++) this.b[this.n++] = s.charCodeAt(i) & 255;
  };
  Writer.prototype.result = function(){ return this.b.slice(0, this.n); };

  /* ---- LZW ---- */
  function lzw(indices, minCodeSize){
    var clear = 1 << minCodeSize, eoi = clear + 1;
    var codeSize = minCodeSize + 1, next = eoi + 1;
    var out = new Uint8Array(Math.max(64, indices.length >> 1));
    var olen = 0, bitBuf = 0, bitLen = 0;
    function emit8(v){
      if (olen >= out.length){
        var nb = new Uint8Array(out.length * 2);
        nb.set(out); out = nb;
      }
      out[olen++] = v & 255;
    }
    function push(code, size){
      bitBuf |= code << bitLen;
      bitLen += size;
      while (bitLen >= 8){
        emit8(bitBuf & 255);
        bitBuf >>>= 8;
        bitLen -= 8;
      }
    }
    var dict = new Map();
    push(clear, codeSize);
    if (indices.length === 0){
      push(eoi, codeSize);
      if (bitLen > 0) emit8(bitBuf & 255);
      return out.subarray(0, olen);
    }
    var prefix = indices[0];
    for (var i = 1; i < indices.length; i++){
      var k = indices[i];
      var key = (prefix << 8) | k;
      var found = dict.get(key);
      if (found !== undefined){ prefix = found; continue; }
      push(prefix, codeSize);
      if (next < 4096){
        dict.set(key, next++);
        // 解码器落后编码器一条表项（KwKwK），其"下一个可用码"= next-1。
        // 解码器在 next-1 达到 2^codeSize 时扩位，因此编码器在 next 达到 2^codeSize+1 时扩位，
        // 这样字宽切换点两边完全对齐（已用 PIL/浏览器解码逐像素校验）。
        if (next === (1 << codeSize) + 1 && codeSize < 12) codeSize++;
      } else {
        push(clear, codeSize);
        dict.clear();
        next = eoi + 1;
        codeSize = minCodeSize + 1;
      }
      prefix = k;
    }
    push(prefix, codeSize);
    push(eoi, codeSize);
    if (bitLen > 0) emit8(bitBuf & 255);
    return out.subarray(0, olen);
  }

  /* ---- 中位切分量化 ---- */
  /* ---- 半透明扁平化：GIF 只有"透明 / 不透明"两态，
         逐像素 alpha 必须先与背景合成实色，否则半透明光晕会被当成纯色，出现大片色块 ---- */
  function flattenFrame(data, bg, threshold){
    var px = data.length >> 2;
    var rgb = new Uint8Array(px * 3);
    var mask = new Uint8Array(px);
    for (var i = 0; i < px; i++){
      var o = i << 2;
      var a = data[o + 3];
      if (a < threshold) continue;            // mask 保持 0 → 透明
      var f = a / 255, g = 1 - f;
      rgb[i*3]     = data[o]     * f + bg[0] * g;
      rgb[i*3 + 1] = data[o + 1] * f + bg[1] * g;
      rgb[i*3 + 2] = data[o + 2] * f + bg[2] * g;
      mask[i] = 1;
    }
    return { rgb: rgb, mask: mask, px: px };
  }

  function collectSamples(frames, maxSamples){
    maxSamples = Math.max(0, Math.floor(maxSamples || 0));
    var out = new Uint8Array(maxSamples * 3), n = 0;
    if (!frames.length || !maxSamples) return out;
    // Give every frame its share before sampling pixels. A full early frame
    // must not consume the palette budget of later animation colours.
    for (var i = 0; i < frames.length; i++){
      var budget = Math.floor((i + 1) * maxSamples / frames.length) - Math.floor(i * maxSamples / frames.length);
      if (!budget) continue;
      var f = frames[i], rgb = f.rgb, mask = f.mask, visible = 0;
      for (var p = 0; p < f.px; p++) if (mask[p]) visible++;
      var wanted = Math.min(budget, visible);
      if (!wanted) continue;
      // Stratify over visible pixels, so transparent margins do not waste
      // a frame's samples or bias the palette towards the image's top edge.
      var seen = 0, taken = 0, next = Math.floor(visible / (2 * wanted));
      for (p = 0; p < f.px && taken < wanted; p++){
        if (!mask[p]) continue;
        if (seen++ < next) continue;
        out[n*3] = rgb[p*3]; out[n*3 + 1] = rgb[p*3 + 1]; out[n*3 + 2] = rgb[p*3 + 2];
        n++; taken++;
        next = Math.floor((taken + 0.5) * visible / wanted);
      }
    }
    return out.subarray(0, n*3);
  }

  function medianCut(samples, maxColors){
    var n = samples.length / 3;
    if (n === 0) return [[0,0,0]];
    var boxes = [];
    var all = new Int32Array(n);
    for (var i = 0; i < n; i++) all[i] = i;
    boxes.push({ px: all, depth: 0 });

    function stats(box){
      var lo = [255,255,255], hi = [0,0,0], px = box.px;
      for (var i = 0; i < px.length; i++){
        var o = px[i]*3;
        for (var c = 0; c < 3; c++){
          var v = samples[o+c];
          if (v < lo[c]) lo[c] = v;
          if (v > hi[c]) hi[c] = v;
        }
      }
      box.lo = lo; box.hi = hi;
      box.count = px.length;
      var r = [hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2]];
      box.range = Math.max(r[0], r[1], r[2]);
      box.ch = r[0] >= r[1] ? (r[0] >= r[2] ? 0 : 2) : (r[1] >= r[2] ? 1 : 2);
      box.score = box.range * Math.pow(box.count, 0.72);
      return box;
    }
    function split(box){
      var px = box.px, ch = box.ch, i;
      var arr = Array.prototype.slice.call(px);
      arr.sort(function(a, b){ return samples[a*3+ch] - samples[b*3+ch]; });
      var mid = arr.length >> 1;
      if (mid <= 0 || mid >= arr.length) return false;
      var left = [], right = [];
      for (i = 0; i < arr.length; i++){
        if (i < mid) left.push(arr[i]); else right.push(arr[i]);
      }
      if (left.length === 0 || right.length === 0) return false;
      box.px = left;
      var nb = { px: right, depth: box.depth + 1 };
      boxes.push(nb);
      stats(box); stats(nb);
      return true;
    }

    stats(boxes[0]);
    while (boxes.length < maxColors){
      var best = null, bestScore = -1;
      for (var b = 0; b < boxes.length; b++){
        if (boxes[b].count < 2) continue;
        if (boxes[b].range <= 0) continue;
        if (boxes[b].score > bestScore){ bestScore = boxes[b].score; best = boxes[b]; }
      }
      if (!best) break;
      if (!split(best)) { best.score = -1; }
    }

    var pal = [];
    for (var q = 0; q < boxes.length; q++){
      var box = boxes[q], sum = [0,0,0];
      var pxq = box.px || [];
      var cnt = Math.max(1, pxq.length);
      for (var j = 0; j < pxq.length; j++){
        var o2 = pxq[j]*3;
        sum[0] += samples[o2]; sum[1] += samples[o2+1]; sum[2] += samples[o2+2];
      }
      pal.push([Math.round(sum[0]/cnt), Math.round(sum[1]/cnt), Math.round(sum[2]/cnt)]);
    }
    return pal;
  }

  function buildLookup(pal){
    var lut = new Uint8Array(32768);
    for (var key = 0; key < 32768; key++){
      var r = ((key >> 10) & 31) << 3, g = ((key >> 5) & 31) << 3, b = (key & 31) << 3;
      var bi = 0, bd = Infinity;
      for (var i = 0; i < pal.length; i++){
        var dr = r - pal[i][0], dg = g - pal[i][1], db = b - pal[i][2];
        var d = dr*dr*3 + dg*dg*6 + db*db*1;
        if (d < bd){ bd = d; bi = i; }
      }
      lut[key] = bi;
    }
    return lut;
  }

  function mapFrame(f, lut, offset){
    var out = new Uint8Array(f.px);
    var rgb = f.rgb, mask = f.mask;
    for (var i = 0; i < f.px; i++){
      if (!mask[i]){ out[i] = 0; continue; }
      var o = i*3;
      var key = ((rgb[o] >> 3) << 10) | ((rgb[o+1] >> 3) << 5) | (rgb[o+2] >> 3);
      out[i] = lut[key] + offset;
    }
    return out;
  }

  /* ---- 组装 GIF89a ---- */
  function assemble(spec){
    var w = new Writer();
    w.ascii('GIF89a');
    w.u16(spec.width);
    w.u16(spec.height);
    var bits = 1;
    while ((1 << bits) < spec.palette.length) bits++;
    if (bits > 8) bits = 8;
    var tableSize = 1 << bits;
    var transparent = (spec.transparent === undefined || spec.transparent === null) ? -1 : spec.transparent;
    w.u8(0x80 | ((bits - 1) & 7) | 0x70);
    w.u8(transparent >= 0 ? transparent : 0);
    w.u8(0);
    for (var i = 0; i < tableSize; i++){
      var c = spec.palette[i] || [0,0,0];
      w.u8(c[0]); w.u8(c[1]); w.u8(c[2]);
    }
    // Netscape 循环扩展
    w.u8(0x21); w.u8(0xFF); w.u8(0x0B);
    w.ascii('NETSCAPE2.0');
    w.u8(0x03); w.u8(0x01); w.u16(spec.loop || 0); w.u8(0x00);

    var minCode = Math.max(2, bits);
    for (var f = 0; f < spec.frames.length; f++){
      // 图形控制扩展：disposal=2（恢复背景），透明
      w.u8(0x21); w.u8(0xF9); w.u8(0x04);
      w.u8((2 << 2) | (transparent >= 0 ? 1 : 0));
      w.u16(Math.max(1, spec.delayCs));
      w.u8(transparent >= 0 ? transparent : 0);
      w.u8(0x00);
      // 图像描述符
      w.u8(0x2C);
      w.u16(0); w.u16(0); w.u16(spec.width); w.u16(spec.height);
      w.u8(0x00);
      w.u8(minCode);
      var data = lzw(spec.frames[f], minCode);
      for (var p = 0; p < data.length; p += 255){
        var len = Math.min(255, data.length - p);
        w.u8(len);
        w.blob(data.subarray(p, p + len));
      }
      w.u8(0x00);
    }
    w.u8(0x3B);
    return w.result();
  }

  function encode(opts){
    // opts: {width, height, frames:[{data,w,h}], transparent, delayMs, loop, maxColors, bg, alphaThreshold, palette}
    var transparent = !!opts.transparent;
    var bg = opts.bg || [7, 11, 18];
    var threshold = opts.alphaThreshold === undefined ? 24 : opts.alphaThreshold;
    var maxColors = Math.min(255, opts.maxColors || (transparent ? 255 : 256));
    var i;
    var flat = [];
    for (i = 0; i < opts.frames.length; i++){
      flat.push(flattenFrame(opts.frames[i].data, bg, transparent ? threshold : 0));
    }
    var colors = opts.palette;
    if (!colors){
      var samples = collectSamples(flat, 60000);
      colors = medianCut(samples, maxColors);
    }
    var palette = transparent ? ([[0,0,0]].concat(colors)) : colors;
    if (palette.length > 256) palette = palette.slice(0, 256);
    var lut = buildLookup(transparent ? palette.slice(1) : palette);
    var offset = transparent ? 1 : 0;
    var idx = [];
    for (i = 0; i < flat.length; i++){
      idx.push(mapFrame(flat[i], lut, offset));
    }
    return assemble({
      width: opts.width,
      height: opts.height,
      palette: palette,
      transparent: transparent ? 0 : null,
      delayCs: Math.max(1, Math.round((opts.delayMs || 60) / 10)),
      loop: opts.loop === undefined ? 0 : opts.loop,
      frames: idx
    });
  }

  return { encode: encode, lzw: lzw, medianCut: medianCut, buildLookup: buildLookup,
           collectSamples: collectSamples, assemble: assemble, flattenFrame: flattenFrame };

})();

