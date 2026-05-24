import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const sourceIndex = path.join(root, 'index.html');
const distIndex = path.join(distDir, 'index.html');

if (!fs.existsSync(distDir)) {
  throw new Error(`Missing dist directory: ${distDir}`);
}
if (!fs.existsSync(sourceIndex)) {
  throw new Error(`Missing source index.html: ${sourceIndex}`);
}

fs.copyFileSync(sourceIndex, distIndex);
console.log(`Copied ${sourceIndex} -> ${distIndex}`);
