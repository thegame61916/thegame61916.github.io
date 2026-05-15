import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publications, projects, collaborators, students, site, generatedMedia } from './fixtures.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function publicAssetExists(assetPath) {
  if (!assetPath || /^https?:\/\//.test(assetPath) || assetPath.startsWith('mailto:') || assetPath.startsWith('#')) return true;
  if (!assetPath.startsWith('/')) return true;
  return fs.existsSync(path.join(root, 'public', assetPath));
}

test.describe('local media and asset references', () => {
  test('all local image, pdf and media paths referenced by content exist', () => {
    const paths = [
      site.photo,
      site.cv,
      ...publications.flatMap(pub => [
        pub.thumbnail,
        pub.localPdf,
        pub.awardCertificate,
        ...(pub.supplements || []).flatMap(item => [item.path]),
        ...(pub.videos || []).flatMap(item => [item.path])
      ]),
      ...projects.map(project => project.image),
      ...collaborators.map(person => person.photo),
      ...students.map(student => student.photo),
      ...(generatedMedia.gallery || []).map(item => item.src),
      ...(generatedMedia.hobbies || []).map(item => item.src)
    ].filter(Boolean);

    for (const assetPath of paths) expect(publicAssetExists(assetPath), `Missing asset: ${assetPath}`).toBe(true);
  });

  test('collaborators do not use generic placeholder images', () => {
    for (const collaborator of collaborators) {
      expect(collaborator.photo || '', `${collaborator.name} uses a placeholder image`).not.toMatch(/placeholder/i);
    }
  });

  test('generated media IDs are unique across gallery and hobbies', () => {
    const ids = [...(generatedMedia.gallery || []), ...(generatedMedia.hobbies || [])].map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
