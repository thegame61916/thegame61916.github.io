import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distAssetsDir = path.join(root, 'dist', 'assets');
const rootAssetsDir = path.join(root, 'assets');
const targets = ['main.js', 'main.css'];

if (!fs.existsSync(distAssetsDir)) {
  throw new Error(`Missing dist assets directory: ${distAssetsDir}`);
}
if (!fs.existsSync(rootAssetsDir)) {
  throw new Error(`Missing root assets directory: ${rootAssetsDir}`);
}

let copied = 0;
for (const file of targets) {
  const source = path.join(distAssetsDir, file);
  const dest = path.join(rootAssetsDir, file);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing built asset: ${source}`);
  }

  const sourceData = fs.readFileSync(source);
  const destData = fs.existsSync(dest) ? fs.readFileSync(dest) : null;

  if (destData && Buffer.compare(sourceData, destData) === 0) {
    continue;
  }

  fs.writeFileSync(dest, sourceData);
  copied += 1;
  console.log(`Synced ${file}`);
}

if (copied === 0) {
  console.log('Root assets already up to date.');
} else {
  console.log(`Synced ${copied} root asset file(s).`);
}
