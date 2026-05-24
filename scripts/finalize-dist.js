import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const sourceIndex = path.join(root, 'index.html');
const distIndex = path.join(distDir, 'index.html');
const assetVersion = (
  process.env.BUILD_ID ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  Date.now().toString(36)
).slice(0, 12);

if (!fs.existsSync(distDir)) {
  throw new Error(`Missing dist directory: ${distDir}`);
}
if (!fs.existsSync(sourceIndex)) {
  throw new Error(`Missing source index.html: ${sourceIndex}`);
}

const source = fs.readFileSync(sourceIndex, 'utf8');
const patched = source.replace(/__ASSET_VERSION__/g, assetVersion);
fs.writeFileSync(distIndex, patched, 'utf8');
console.log(`Wrote ${distIndex} with asset version ${assetVersion}`);
