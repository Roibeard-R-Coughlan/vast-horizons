# Vast Horizons

A lightweight business website for Vast Horizons, an AI, workflow and automation consultancy focused on practical improvements for businesses in Ireland.

## Structure

- `/` - main consulting website
- `/construction/` - campaign landing page for construction and project-led businesses
- `assets/css/styles.css` - shared visual system and responsive styles
- `assets/js/site.js` - mobile navigation and small progressive enhancements

The site is static and deploys through the existing GitHub Pages and `CNAME` setup.

## Trades hero video

The `/trades/` hero uses `assets/video/trades-mix-hero.mp4`, prepared from the updated `assets/video/drill-mix.mp4`. The web copy removes the export's black side bars, retains the full 60.2-second edit at 30 fps, uses H.264 with no audio, and places MP4 metadata first for faster streaming startup. The page plays it at 90% speed (`data-playback-rate="0.9"`); the slowdown is not baked into the file. Its fallback poster comes from 4.6 seconds into the updated clip. Versioned video and poster URLs refresh cached copies.

Preparation with FFmpeg:

```powershell
ffmpeg -i assets/video/drill-mix.mp4 -map 0:v:0 -vf "crop=572:1080:674:0,setsar=1" -c:v libx264 -preset slow -crf 26 -profile:v high -level:v 4.0 -pix_fmt yuv420p -an -map_metadata -1 -movflags +faststart -y assets/video/trades-mix-hero.mp4
ffmpeg -ss 4.6 -i assets/video/trades-mix-hero.mp4 -frames:v 1 -q:v 3 -y assets/images/trades-hero-poster.jpg
```

## ChatBase follow-up

The existing ChatBase embed and bot ID are preserved unchanged on both pages. Update the ChatBase knowledge base separately to reflect the workflow-first positioning, no-cost introductory audit offer, construction landing page, accurate background, implementation support, and the distinction between opportunity examples and completed client work.
