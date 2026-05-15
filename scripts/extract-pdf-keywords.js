import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

const root = process.cwd();
const publications = JSON.parse(fs.readFileSync(path.join(root, 'src/data/publications.json'), 'utf8'));
const configPath = path.join(root, 'src/data/keyword-config.json');
const keywordConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
const out = path.join(root, 'src/data/generated-publication-keywords.json');

const STOP = new Set(`a an and are as at be by can for from has have in into is it its of on or our that the their this to using with we was were while paper papers data figure figures method methods analysis analyses visualization visual topological topology based field fields result results show shows study studies approach approaches application applications proposed new structure structures algorithm algorithms`.split(/\s+/));
const EXCLUDED = new Set([...(keywordConfig.excludeKeywords || []), ...(keywordConfig.excludeAutoKeywords || []), ...STOP].map(normalize));
const PREFERRED = keywordConfig.preferredKeywords || [];
const ALIASES = keywordConfig.aliases || {};

function normalize(term = '') {
  return String(term).trim().replace(/[_\s]+/g, ' ').replace(/[.,;:()[\]{}]+$/g, '').toLowerCase();
}
function canonical(term = '') {
  const key = normalize(term);
  return ALIASES[key] || key;
}
function valid(term = '', pub = null) {
  const key = normalize(canonical(term));
  const localHidden = pub ? [
    ...(pub.hiddenKeywords || []),
    ...(pub.hiddenAutoKeywords || [])
  ].map(normalize) : [];
  return key.length >= 3 && !EXCLUDED.has(key) && !localHidden.includes(key) && !/^\d+$/.test(key);
}
function localPdfFor(pub) {
  const candidates = [pub.localPdf, `/assets/publications/pdf/${pub.id}.pdf`, `/assets/publications/pdf/${pub.id.replace(/-/g, '_')}.pdf`].filter(Boolean);
  for (const rel of candidates) {
    if (/^https?:\/\//.test(rel)) continue;
    const abs = path.join(root, 'public', rel.replace(/^\//, ''));
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}
function countPhrase(text, phrase) {
  const escaped = normalize(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return (text.match(new RegExp(`\\b${escaped}\\b`, 'g')) || []).length;
}
function scoreTerms(text, pub) {
  const lower = normalize(text.replace(/[^a-zA-Z0-9\-\s]/g, ' '));
  const found = new Map();
  for (const phrase of PREFERRED) {
    const count = countPhrase(lower, phrase);
    if (count && valid(phrase, pub)) found.set(canonical(phrase), count + 50);
  }
  const phrases = [...lower.matchAll(/\b[a-z][a-z0-9-]{3,}(?:\s+[a-z][a-z0-9-]{3,}){1,2}\b/g)].map(m => m[0]);
  for (const phrase of phrases) {
    const words = phrase.split(/\s+/);
    if (words.every(w => valid(w, pub)) && valid(phrase, pub)) found.set(canonical(phrase), (found.get(canonical(phrase)) || 0) + 2);
  }
  const words = lower.split(/\s+/).filter(w => valid(w, pub));
  for (const w of words) found.set(canonical(w), (found.get(canonical(w)) || 0) + 1);
  return [...found.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .filter(term => valid(term, pub))
    .slice(0, 10);
}

const generated = {};
for (const pub of publications) {
  const pdfPath = localPdfFor(pub);
  if (!pdfPath) { generated[pub.id] = []; continue; }
  try {
    const buf = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy();
    generated[pub.id] = scoreTerms(result.text || '', pub);
    console.log(`${pub.id}: ${generated[pub.id].join(', ')}`);
  } catch (e) {
    console.warn(`Could not parse ${pdfPath}: ${e.message}`);
    generated[pub.id] = [];
  }
}
fs.writeFileSync(out, JSON.stringify(generated, null, 2) + '\n');
console.log(`Wrote ${out}`);
