import fs from 'node:fs';
const path = new URL('../src/data/publications.json', import.meta.url);
const pubs = JSON.parse(fs.readFileSync(path, 'utf8'));
const stamp = new Date().toISOString();
console.log(`Publication refresh placeholder ran at ${stamp}.`);
console.log('Static GitHub Pages cannot securely sync Google Scholar directly from the browser.');
console.log('Recommended: update src/data/publications.json or replace this script with an ORCID/Scholar API workflow you control.');
console.log(`Current publication records: ${pubs.length}`);
