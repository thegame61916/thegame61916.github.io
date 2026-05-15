# Testing Guide

The site is covered by Playwright end-to-end tests plus content/schema checks.

## Local Commands

The project uses Vite 8, which requires Node 20.19+ or Node 22. If your system Node is older, use the Node 22 helper script:

```bash
npm run test:e2e:node22
```

If your local Node is already compatible:

```bash
npm test
```

Interactive debugging:

```bash
npm run test:e2e:ui
```

## Browser Setup

Run once on a new machine:

```bash
npx playwright install chromium
```

## What Is Covered

- Content schema and cross-reference integrity.
- Local asset existence for images, PDFs, generated gallery media, and profile/project/student media.
- Hash routing for all main pages and detail pages.
- Publication detail tabs, previews, material links, BibTeX, related projects.
- Project detail pages, related publications, and collaborator strips.
- Global search, keyboard search navigation, escape dismissal, and result routing.
- Publication text, year, type, and keyword filters.
- List/grid view switches.
- Desktop, tablet, and mobile layout health.
- Mobile offcanvas navigation.
- Broken completed images, horizontal overflow, missing landmarks/headings, empty buttons, and browser console/page errors.

## CI

`.github/workflows/test.yml` runs on pushes, pull requests, and manual dispatch. It uses Node 22, installs Chromium, and runs:

```bash
npm test
```
