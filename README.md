# Mohit Sharma — Academic Website

A production-ready static academic website for GitHub Pages. It is built with **Vite + React + Bootstrap**, keeps content in JSON files, and supports folder-driven media generation for gallery/hobbies.

## Tech stack

- **Vite + React**: fast static build and easy GitHub Pages deployment.
- **Bootstrap + custom CSS**: responsive, adaptive layouts that use desktop/tablet/mobile screen space efficiently.
- **JSON content layer**: update publications, people, projects, students, talks, news, awards, and site metadata without touching React code.
- **Fuse.js**: client-side global search.
- **Folder scan scripts**: add images/videos into media folders and generate JSON automatically.
- **PDF keyword extraction script**: parse local paper PDFs and generate extra publication keywords for the filter dropdown.

## Folder structure

```text
mohit-academic-website/
├── public/assets/
│   ├── profile/                    # profile photo
│   ├── publications/
│   │   └── pdf/                    # local publication PDFs named <publication-id>.pdf
│   ├── collaborators/              # collaborator photos
│   ├── students/                   # student photos
│   ├── projects/                   # project teaser media
│   ├── gallery/                    # folder-driven gallery categories
│   │   ├── research/
│   │   ├── conferences/
│   │   ├── talks/
│   │   ├── theater/
│   │   ├── fitness/
│   │   └── poetry/
│   ├── hobbies/                    # folder-driven hobbies media
│   │   ├── theater/
│   │   ├── fitness/
│   │   └── poetry/
│   └── cv/
├── src/data/                       # editable JSON content
│   ├── publications.json
│   ├── generated-publication-keywords.json
│   └── generated-media.json
├── scripts/
│   ├── scan-media.js
│   ├── extract-pdf-keywords.js
│   └── download-publications.sh
└── .github/workflows/
```

## Run locally

```bash
npm install
npm run dev
```

If npm crashes with `Exit handler never called`, use Node 20 LTS and clear the cache:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run dev
```

Or use pnpm:

```bash
corepack enable
pnpm install
pnpm dev
```

## Build

```bash
npm run build
npm run preview
```

## Updating content without touching React code

Edit the JSON files in `src/data/`:

- `site.json`: profile, bio, contact links, CV, research interests.
- `publications.json`: publications, DOI, BibTeX, tags, related projects, PDFs.
- `collaborators.json`: collaborators and their photos/links.
- `projects.json`: research projects and related publications/people.
- `students.json`: mentees and alumni.
- `talks.json`: talks, slides, videos.
- `news.json`: updates.
- `awards.json`: recognitions.

Missing links are handled gracefully: leave an empty string and the UI hides the button or disables the external link.

## Folder-driven gallery and hobbies

You do not need to edit React code to add media.

### Add gallery media

Put files into category folders:

```text
public/assets/gallery/research/
public/assets/gallery/conferences/
public/assets/gallery/talks/
public/assets/gallery/theater/
public/assets/gallery/fitness/
public/assets/gallery/poetry/
```

Then run:

```bash
npm run scan:media
```

The script updates `src/data/generated-media.json`, and the website reads it automatically.

### Add hobbies media

Put files into:

```text
public/assets/hobbies/theater/
public/assets/hobbies/fitness/
public/assets/hobbies/poetry/
```

Then run:

```bash
npm run scan:media
```

### Optional captions

Inside any media folder, add a `captions.json`:

```json
{
  "my-photo.jpg": {
    "title": "Conference presentation",
    "caption": "Presenting recent work on Reeb spaces.",
    "date": "2026-05-13",
    "related": ["reeb-space-fiber-analysis"]
  }
}
```

## Publication keywords and filters

The publication keyword dropdown is generated dynamically from:

1. `tags` in `src/data/publications.json`
2. optional `autoKeywords` in each publication
3. generated PDF keywords in `src/data/generated-publication-keywords.json`

### Extract keywords from PDFs

Place local PDFs here:

```text
public/assets/publications/pdf/<publication-id>.pdf
```

Example:

```text
public/assets/publications/pdf/csp-moments-2025.pdf
```

Then run:

```bash
npm run extract:keywords
```

This parses the PDFs and updates `src/data/generated-publication-keywords.json`. The filter dropdown updates automatically on the next build.

## Publication PDFs

The publication JSON contains external PDF/DOI links when available. To vendor PDFs locally, either manually place files under `public/assets/publications/pdf/` or run:

```bash
bash scripts/download-publications.sh
```

Then use `localPdf` or `pdf` paths such as:

```json
"localPdf": "/assets/publications/pdf/csp-moments-2025.pdf"
```

## Deploy on GitHub Pages

1. Push the project to your repository, for example `ms61916.github.io`.
2. In GitHub, go to **Settings → Pages**.
3. Choose **GitHub Actions** as the source.
4. The included `.github/workflows/deploy.yml` builds and deploys automatically.

## Monthly metadata refresh

A fully static browser-only website cannot safely sync Google Scholar/ORCID directly from the user’s browser. The repository includes a scheduled workflow hook. For reliable syncing, update `scripts/refresh-publications.js` to pull from an API/source you control, then commit the resulting JSON changes.

## Content editing documentation

See `CONTENT_GUIDE.md` for how to add publications, local PDFs, supplementary files, split previews, students, news, talks, and gallery media without changing React components.

## Content updates

See `CONTENT_SCHEMA.md` for the full publication/project/people/news/media schema and keyword workflow.

Most routine changes should be made in:

- `src/data/publications.json`
- `src/data/projects.json`
- `src/data/collaborators.json`
- `src/data/students.json`
- `src/data/news.json`
- `src/data/home-media.json`
- `src/data/keyword-config.json`

Use `npm run prepare:content` after adding local media/PDFs.
