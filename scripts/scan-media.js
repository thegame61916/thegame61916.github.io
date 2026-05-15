import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'src/data/generated-media.json');
const publicRoot = path.join(root, 'public');
const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);
const videoExt = new Set(['.mp4', '.webm', '.mov', '.m4v']);

function titleFromFile(file) { return path.basename(file, path.extname(file)).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function readJson(file, fallback = {}) { if (!fs.existsSync(file)) return fallback; try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.warn(`Could not parse ${file}: ${e.message}`); return fallback; } }
function scanBase(baseRel, kind) {
  const base = path.join(publicRoot, baseRel);
  if (!fs.existsSync(base)) return { items: [], folders: [] };
  const items = [], folders = [];
  for (const category of fs.readdirSync(base, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const dir = path.join(base, category.name);
    const folder = readJson(path.join(dir, 'folder.json'), {});
    const captions = readJson(path.join(dir, 'captions.json'), {});
    const categoryTitle = folder.title || titleFromFile(category.name);
    folders.push({
      id: `${kind}-${category.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: categoryTitle,
      folder: category.name,
      description: folder.description || '',
      youtube: folder.youtube || '',
      website: folder.website || '',
      order: folder.order ?? 999
    });
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || ['captions.json', 'folder.json', 'README.md'].includes(entry.name) || entry.name.startsWith('.')) continue;
      const ext = path.extname(entry.name).toLowerCase();
      const type = imageExt.has(ext) ? 'image' : videoExt.has(ext) ? 'video' : null;
      if (!type) continue;
      const meta = captions[entry.name] || {};
      const src = `/${baseRel}/${category.name}/${entry.name}`.replace(/\\/g, '/');
      items.push({
        id: meta.id || `${kind}-${category.name}-${path.basename(entry.name, ext)}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: meta.title || titleFromFile(entry.name),
        type,
        category: meta.category || categoryTitle,
        src,
        caption: meta.caption || meta.description || '',
        description: meta.description || meta.caption || '',
        date: meta.date || '',
        related: meta.related || []
      });
    }
  }
  items.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
  folders.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  return { items, folders };
}

const gallery = scanBase('assets/gallery', 'gallery');
const hobbies = scanBase('assets/hobbies', 'hobby');
const data = { gallery: gallery.items, galleryFolders: gallery.folders, hobbies: hobbies.items, hobbyFolders: hobbies.folders };
fs.writeFileSync(output, JSON.stringify(data, null, 2) + '\n');
console.log(`Generated ${output}`);
console.log(`Gallery items: ${data.gallery.length}; hobby items: ${data.hobbies.length}`);
