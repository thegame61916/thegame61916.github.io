import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relativePath => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

export const site = readJson('src/data/site.json');
export const publications = readJson('src/data/publications.json');
export const projects = readJson('src/data/projects.json');
export const collaborators = readJson('src/data/collaborators.json');
export const students = readJson('src/data/students.json');
export const teaching = readJson('src/data/teaching.json');
export const talks = readJson('src/data/talks.json');
export const news = readJson('src/data/news.json');
export const timeline = readJson('src/data/timeline.json');
export const generatedMedia = readJson('src/data/generated-media.json');

export const navRoutes = [
  ['home', 'Home'],
  ['about', 'About'],
  ['research', 'Research'],
  ['projects', 'Projects'],
  ['publications', 'Publications'],
  ['people', 'People'],
  ['teaching', 'Teaching'],
  ['talks', 'Talks'],
  ['gallery', 'Gallery'],
  ['news', 'News'],
  ['contact', 'Contact']
];

export const featuredPublications = [...publications]
  .sort((a, b) => (b.year || 0) - (a.year || 0))
  .slice(0, 4);

export const firstPublication = publications[0];
export const firstProject = projects[0];
