import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const publications = readJson('src/data/publications.json');
const projects = readJson('src/data/projects.json');
const collaborators = readJson('src/data/collaborators.json');
const students = readJson('src/data/students.json');

let warnings = 0;
const warn = msg => { warnings += 1; console.warn(`Content warning: ${msg}`); };
const ids = new Set();

for (const pub of publications) {
  if (!pub.id) warn(`publication missing id: ${pub.title || '(untitled)'}`);
  if (pub.id && ids.has(pub.id)) warn(`duplicate publication id: ${pub.id}`);
  if (pub.id) ids.add(pub.id);
  ['title', 'authorText', 'venue', 'year', 'type'].forEach(field => { if (!pub[field]) warn(`${pub.id || pub.title} missing ${field}`); });
  if (!pub.thumbnail) warn(`${pub.id} missing thumbnail`);
  if (!pub.abstract) warn(`${pub.id} missing abstract`);
  if (!pub.filterKeywords?.length) warn(`${pub.id} has no filterKeywords; it will not add terms to the keyword dropdown when useExplicitFilterKeywordsOnly=true`);
  for (const author of pub.authors || []) {
    if (!collaborators.find(c => c.id === author)) warn(`${pub.id} refers to missing collaborator/author id: ${author}`);
  }
  for (const project of pub.projects || []) {
    if (!projects.find(p => p.id === project)) warn(`${pub.id} refers to missing project id: ${project}`);
  }
}

for (const project of projects) {
  ['id', 'title'].forEach(field => { if (!project[field]) warn(`project missing ${field}`); });
  for (const pubId of project.publications || []) {
    if (!publications.find(p => p.id === pubId)) warn(`${project.id} refers to missing publication id: ${pubId}`);
  }
}

for (const student of students) {
  ['id', 'name', 'category'].forEach(field => { if (!student[field]) warn(`student missing ${field}: ${student.name || student.id || '(unknown)'}`); });
}

if (warnings) console.warn(`Validation completed with ${warnings} warning(s). Build will continue.`);
else console.log('Content validation passed.');
