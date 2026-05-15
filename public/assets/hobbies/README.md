# Folder-driven hobbies and additional activities

Create one folder per activity:

```text
public/assets/hobbies/theater/
public/assets/hobbies/fitness/
public/assets/hobbies/poetry/
```

Inside each folder, place images/videos. Supported: jpg, jpeg, png, webp, gif, svg, avif, mp4, webm, mov, m4v.

Optional `folder.json`:

```json
{
  "title": "Theater",
  "description": "Selected theater performances and backstage moments.",
  "youtube": "https://youtube.com/...",
  "order": 1
}
```

Optional `captions.json`:

```json
{
  "stage-photo.jpg": {
    "title": "Stage Performance",
    "caption": "Performance photo from ...",
    "date": "2025-03-20"
  }
}
```

After adding files, run:

```bash
npm run scan:media
```
