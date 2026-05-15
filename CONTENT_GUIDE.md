# Content update guide

This website is designed so that most future updates happen in `src/data/*.json` and `public/assets/*`, not in React code.

## 1. Publications

Edit `src/data/publications.json`. Each publication is one JSON object.

Important fields:

```json
{
  "id": "unique-paper-id",
  "type": "Journal Article",
  "category": "Journal Article",
  "title": "Paper title",
  "authors": ["mohit-sharma", "collaborator-id"],
  "authorText": "Mohit Sharma and Collaborator Name",
  "venue": "IEEE TVCG",
  "year": 2026,
  "doi": "https://doi.org/...",
  "pdf": "https://external-pdf-url.pdf",
  "localPdf": "/assets/publications/pdfs/my-paper.pdf",
  "thumbnail": "/assets/publications/teasers/my-paper.png",
  "tags": ["Reeb Spaces", "Scientific Visualization"],
  "abstract": "Abstract text",
  "bibtex": "@article{...}",
  "projects": ["project-id"],
  "supplements": [
    {
      "label": "Supplementary PDF",
      "type": "pdf",
      "url": "https://external-supplement.pdf",
      "path": "/assets/publications/supplements/my-supplement.pdf",
      "preview": false
    }
  ],
  "videos": [
    {
      "label": "Talk video",
      "url": "https://www.youtube.com/watch?v=VIDEO_ID",
      "preview": false
    }
  ],
  "links": [
    { "label": "Code", "url": "https://github.com/..." },
    { "label": "Data", "url": "https://..." }
  ]
}
```

### Local PDFs and supplements

Put files in:

- PDFs: `public/assets/publications/pdfs/`
- Supplementary PDFs: `public/assets/publications/supplements/`
- Teaser images: `public/assets/publications/teasers/`

Then reference them with absolute public paths, for example:

```json
"localPdf": "/assets/publications/pdfs/paper.pdf"
```

The site uses `localPdf` first, then falls back to `pdf`.

### PDF preview layout

By default, publication detail pages show a full-width PDF preview.

To split the preview into left PDF and right supplementary/video preview, set:

```json
"previewLayout": "split"
```

and set `preview: true` on exactly one supplement or video:

```json
"supplements": [
  {
    "label": "Supplementary PDF",
    "path": "/assets/publications/supplements/paper-supplement.pdf",
    "preview": true
  }
]
```

The `csp-moments-2025` entry is included as an example: PDF on the left, supplementary PDF on the right.

### Publication images

Use a 16:9 or 16:10 teaser when possible. The UI now uses a fixed HD-style container and `object-fit: contain`, so the same image adapts in list view, grid view, and detail pages without cropping.

## 2. Keywords and filters

Explicit tags live in each publication under `tags`.

Automatic PDF keywords are generated into:

```text
src/data/generated-publication-keywords.json
```

Configure cleanup in:

```text
src/data/keyword-config.json
```

Use:

- `excludeKeywords` to remove terms from dropdowns.
- `aliases` to merge or capitalize related terms.
- `includeAutoKeywordsInFilters` to decide whether generated keywords should appear in publication filters.

Example:

```json
{
  "excludeKeywords": ["paper", "method", "figure"],
  "aliases": {
    "reeb space": "Reeb Spaces",
    "tvcg": "TVCG"
  },
  "includeAutoKeywordsInFilters": false
}
```

## 3. Students and alumni

Edit `src/data/students.json`.

```json
{
  "id": "student-id",
  "name": "Student Name",
  "category": "Masters",
  "alumni": true,
  "program": "M.Sc. thesis project",
  "affiliation": "Linköping University",
  "project": "Project title",
  "duration": "2024–2025",
  "currentPosition": "Current role, if alumni",
  "photo": "/assets/students/student-photo.jpg",
  "website": "https://student-webpage.example",
  "links": [
    { "label": "Thesis PDF", "path": "/assets/students/theses/student-thesis.pdf" },
    { "label": "Project page", "url": "https://..." }
  ],
  "projects": ["project-id"],
  "publications": ["publication-id"]
}
```

Categories are shown only when at least one person exists in that category:

- Masters
- Undergrad
- Intern
- PhD
- Postdoc

Set `alumni: true` to move the person to Alumni.

## 4. News

Edit `src/data/news.json`.

News cards are fully clickable. Prefer a site route when possible:

```json
{
  "date": "2026-01-10",
  "title": "Paper accepted",
  "description": "Short description",
  "route": "publication:csp-moments-2025",
  "links": [{ "label": "DOI", "url": "https://doi.org/..." }]
}
```

If `route` is missing, the first link is used.

## 5. Talks

Edit `src/data/talks.json`.

Use `media` for any number of slides, videos, pictures, or PDFs:

```json
{
  "id": "talk-id",
  "title": "Talk title",
  "venue": "Venue",
  "date": "2026-05-14",
  "description": "Short description",
  "slides": "/assets/talks/slides.pdf",
  "video": "https://youtube.com/...",
  "media": [
    { "label": "Photo", "type": "image", "path": "/assets/talks/photo.jpg" },
    { "label": "Extra slides", "type": "pdf", "path": "/assets/talks/extra.pdf" }
  ]
}
```

## 6. Gallery media

Add files under:

```text
public/assets/gallery/<category>/
```

Then run:

```bash
npm run scan:media
```

This regenerates `src/data/generated-media.json`.

## 7. Build and deploy

Install dependencies once:

```bash
npm install
```

Build:

```bash
npm run build
```

For GitHub Pages, commit the repository and use the included GitHub Actions workflow if present.

## Publication preview dropdown

Publication detail pages now show one large, readable preview area. If more than one previewable material exists, the page shows a dropdown so visitors can switch between the paper PDF, supplementary PDFs, and videos.

Example:

```json
{
  "id": "my-paper",
  "pdf": "https://publisher.org/paper.pdf",
  "localPdf": "/assets/publications/pdfs/my-paper.pdf",
  "defaultPreview": "paper",
  "supplements": [
    {
      "id": "supplement-1",
      "label": "Supplementary PDF",
      "type": "pdf",
      "path": "/assets/publications/supplements/my-paper-supp.pdf",
      "preview": true
    }
  ],
  "videos": [
    {
      "id": "video-1",
      "label": "Talk Video",
      "url": "https://www.youtube.com/watch?v=VIDEO_ID",
      "preview": true
    }
  ]
}
```

Set `defaultPreview` to `paper`, `supplement-1`, `video-1`, or any custom `id` you assign. Set `preview: false` on a supplement/video if it should appear only in Materials, not in the preview dropdown.

## Homepage publication cards

The homepage automatically shows the four most recent publications by year. It uses the same `thumbnail` image as publication list/detail pages and displays it in a fixed 16:9 visual area without cropping.

## Header image

The top-left brand uses `site.photo` from `src/data/site.json`. Replace `public/assets/profile/profile-placeholder.svg` or point `photo` to another image path.

## Publication awards and certificate previews

Publication awards are displayed as yellow badges everywhere a publication card appears. Do **not** repeat the award in the venue text. Add awards directly inside the publication entry:

```json
{
  "id": "volume-fusion-2025",
  "award": "Honorable Mention",
  "awardCertificate": "/assets/certificates/topoinvis-2025-honorable-mention.pdf",
  "awardUrl": "",
  "awards": [
    {
      "id": "honorable-mention-certificate",
      "label": "Honorable Mention Certificate",
      "type": "pdf",
      "path": "/assets/certificates/topoinvis-2025-honorable-mention.pdf",
      "url": "",
      "preview": true
    }
  ],
  "defaultPreview": "honorable-mention-certificate"
}
```

Place certificate PDFs/images in `public/assets/certificates/`. Use `path` for local files and `url` for external links. Any award/certificate with `preview: true` appears in the publication-detail preview dropdown together with the paper PDF, supplementary PDFs, and videos. Use `defaultPreview` to choose what opens first.

## Homepage media highlight

The homepage right column contains a scrollable News panel and a `Media Highlight` panel below it. Edit:

```text
src/data/home-media.json
```

You can show one or multiple media items. If multiple items are present, a dropdown appears automatically.

### Image example

```json
{
  "id": "vis-talk-photo",
  "type": "image",
  "title": "Talk at VIS",
  "caption": "A recent talk or conference photo.",
  "image": "/assets/gallery/talks/vis-talk.jpg",
  "alt": "Mohit Sharma presenting at a conference",
  "link": "#talks",
  "linkText": "View talks"
}
```

### Local muted video example

Put the video in `public/assets/gallery/videos/` and reference it:

```json
{
  "id": "demo-video",
  "type": "video",
  "title": "Interactive Reeb Space Demo",
  "caption": "Short muted demo clip. It starts playing when visible on screen.",
  "video": "/assets/gallery/videos/reeb-demo.mp4",
  "poster": "/assets/gallery/videos/reeb-demo-poster.jpg",
  "autoplayMuted": true,
  "loop": true,
  "controls": false
}
```

### YouTube example

```json
{
  "id": "youtube-talk",
  "type": "youtube",
  "title": "Recorded Talk",
  "caption": "Embedded YouTube preview. Autoplay requires mute and begins only when visible.",
  "url": "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
  "autoplayMuted": true,
  "link": "#talks",
  "linkText": "Related talks"
}
```

Use `defaultItemId` in the same file to choose which item appears first.
