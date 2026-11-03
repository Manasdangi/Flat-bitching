# Gurgaon Flat Finder

Find the right **Gurgaon sector** for *your* priorities, whether that's a clean society, women safety, metro access, clean air, being near a market, or a short office commute.

## Features
- **Interactive map** (Leaflet + OpenStreetMap) of 46 popular sectors, with Yellow Line and Rapid Metro stations
- **Search** by sector number, area or society (e.g. `48`, `DLF`, `Sobha`)
- **Sector pages** (`#/sector/48`) with summary, 2BHK and PG rent ranges, nearest metro, scores, pros and cons, and popular societies
- **Priority matcher**: set sliders or use presets (Safe for women, No car, Family, Budget, Clean air), and the map turns into a heatmap of your best sectors
- **Office commute**: pick a preset office hub or pin your own on the map
- **Compare** up to 3 sectors side by side
- **Resident reviews**: stored in Supabase (Postgres with row-level security), or this browser's localStorage in demo mode

## Run locally
```bash
npm install
npm run dev
```

## Shared reviews (Supabase)
Reviews live in a Supabase `reviews` table (schema in `supabase/migrations/`). Row-level security allows anyone to read and post, with no edits or deletes, and the server stamps `created_at`.

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Set the same values in Vercel's environment variables. The publishable key is safe for browsers.

## Data disclaimer
Sector locations are approximate centres. Rents are rough ranges calibrated against 2025–26 listings, and scores are editorial estimates. Metro distance and commute times are computed from approximate coordinates. Always verify in person before renting.

## Stack
React 19 · TypeScript · Vite · react-leaflet · Supabase (REST via fetch)

## Data pipeline (v2)
- **Sector outlines**: OpenStreetMap administrative boundaries, simplified and stored in the Supabase `sector_shapes` table (ODbL).
- **Drive times**: OSRM routing (OpenStreetMap) from each sector to each tech hub, in `drive_times`. Peak time ≈ off-peak × 1.8.
- **Live AQI**: Open-Meteo air-quality API (CAMS model estimate), fetched in the browser.
- **Reviews**: per-aspect ratings and society tags. One review per sector per day per device/IP; 3 reports auto-hide a review. Private spam metadata lives in `review_meta`, which has no public read access.
- **Corrections**: residents suggest fixes in the `corrections` table. Review them in Supabase → Table Editor.
- **SEO**: real URLs (`/sector/48`, `/society/sobha-city`), per-page titles, OG image, and `sitemap.xml` generated on build.
- **PWA**: installable, with an offline app shell (`public/sw.js`).
