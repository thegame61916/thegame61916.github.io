# Keyword and media workflow

## Remove bad keywords from the publication dropdown
Edit:

```text
src/data/keyword-config.json
```

Add unwanted terms to `excludeKeywords`. Example:

```json
"excludeKeywords": ["paper", "data", "method", "simulation"]
```

## Fix capitalization or merge duplicate keywords
Use `aliases` in the same file. Example:

```json
"aliases": {
  "reeb spaces": "Reeb space",
  "ct": "computed tomography",
  "tvcg": "IEEE TVCG"
}
```

The dropdown is not static. It is computed from publication `tags`, generated PDF keywords, and the current search/year/type filters. Counts are shown next to each keyword.

## Automatically parse PDF keywords
Place PDFs here using the publication id as filename:

```text
public/assets/publications/pdf/csp-moments-2025.pdf
public/assets/publications/pdf/volume-fusion-2025.pdf
```

Then run:

```bash
npm run extract:keywords
```

Generated keywords are written to:

```text
src/data/generated-publication-keywords.json
```

For a complete build with media scanning and PDF keyword extraction:

```bash
npm run build:with-keywords
```

## Add gallery or hobby media without touching code
Create folders under:

```text
public/assets/gallery/<category>/
public/assets/hobbies/<activity>/
```

Add images/videos. Optional per-folder metadata lives in `folder.json`; optional media captions live in `captions.json`. Then run:

```bash
npm run scan:media
```

## 2026 UI/content update notes

### Header and homepage counters
- The top-left subtitle is read from `src/data/site.json -> affiliation`.
- Homepage statistic blocks are computed from `src/data/publications.json` and `src/data/projects.json`; they are clickable.

### Publication categories
Use the `type` field in each publication:
```json
"type": "Journal Article"
"type": "Conference Paper"
"type": "Workshop Paper"
"type": "Poster / Extended Abstract"
"type": "Preprint"
```
The publication page filter and grouping read this value automatically.

### Local PDFs, supplements, and videos
For a local PDF copied into `public/assets/publications/paper-id/paper.pdf`, set:
```json
"localPdf": "/assets/publications/paper-id/paper.pdf"
```
For any number of supplements and videos:
```json
"supplements": [
  { "label": "Supplementary PDF", "type": "pdf", "path": "/assets/publications/paper-id/supplement.pdf", "url": "", "preview": true }
],
"videos": [
  { "label": "Talk video", "url": "https://www.youtube.com/watch?v=...", "embed": true, "preview": true }
],
"previewLayout": "split"
```
Use `previewLayout: "single"` for a full-width PDF preview, or `"split"` for PDF plus a second preview panel.

### Keywords
- Edit `src/data/keyword-config.json` to remove keywords from the dropdown using `excludeKeywords`.
- Use `aliases` to merge/capitalize variants.
- `includeAutoKeywordsInFilters` controls whether PDF-extracted keywords appear in the filter dropdown.
- `includeAutoKeywordsInPublicationPages` controls whether extracted keywords appear on publication details.

### Gallery
Add media under `public/assets/gallery/<category>/`. Optional metadata files inside each folder:
- `folder.json` for category description
- `captions.json` for per-file titles/captions
Run `npm run scan:media` or just `npm run build`.

### Students and alumni
Use `src/data/students.json` with:
```json
{
  "name": "Student Name",
  "category": "Masters",
  "alumni": true,
  "currentPosition": "...",
  "photo": "/assets/students/name.jpg"
}
```
Visible categories are generated only when at least one student/alumnus exists.

### News and awards linking
- News can link internally with `route`, e.g. `"route": "publication:volume-fusion-2025"`.
- If no route exists, the first external link is opened.
- Publication awards are automatically shown in Awards and linked to the paper when `publication.award` is set.
