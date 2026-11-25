// 把 index.html + 模块/*.js 打包成一个单文件 HTML（便于单独发出去）
//   node bundle.mjs  →  称号生成器_单文件.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const re = /<script src="([^"]+)"><\/script>/g;
let count = 0;
let totalBytes = 0;
const out = index.replace(re, (m, src) => {
  const p = path.join(root, src.replace(/\//g, path.sep));
  if (!fs.existsSync(p)) throw new Error('missing script: ' + src);
  const code = fs.readFileSync(p, 'utf8');
  count++;
  totalBytes += Buffer.byteLength(code);
  // 避免代码里出现 </script> 提前结束
  const safe = code.replace(/<\/script>/gi, '<\\/script>');
  return '<script>\n/* ==== ' + src + ' ==== */\n' + safe + '\n</script>';
});

const banner = '<!-- 单文件构建：' + new Date().toISOString() + ' · ' + count + ' 个模块内联 -->\n';
const target = path.join(root, '称号生成器_单文件.html');
fs.writeFileSync(target, banner + out, 'utf8');
console.log('bundled ' + count + ' modules (' + (totalBytes / 1024).toFixed(0) + ' KB js) -> ' + path.basename(target) +
  ' · ' + (fs.statSync(target).size / 1024).toFixed(0) + ' KB');
