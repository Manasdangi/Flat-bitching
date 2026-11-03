# Gurgaon Flat Finder

Find the right **Gurgaon sector** for *your* priorities, whether that's a clean society, women safety, metro access, clean air, being near a market, or a short office commute.

## Features
- **Interactive map** (Leaflet + OpenStreetMap) of 46 popular sectors, with Yellow Line and Rapid Metro stations
- **Search** by sector number, area or society (e.g. `48`, `DLF`, `Sobha`)
- **Sector pages** (`#/sector/48`) with summary, 2BHK and PG rent ranges, nearest metro, scores, pros and cons, and popular societies
- **Priority matcher**: set sliders or use presets (Safe for women, No car, Family, Budget, Clean air), and the map turns into a heatmap of your best sectors
- **Office commute**: pick a preset office hub or pin your own on the map
- **Compare** up to 3 sectors side by side
- **Resident reviews**: stored in Firebase Firestore, or this browser's localStorage in demo mode

## Run locally
```bash
npm install
npm run dev
```

## Enable shared reviews (Firebase)
1. Create a Firebase project, add a Web app, and enable **Firestore**.
2. Copy `.env.example` to `.env.local` and fill in the values. On Vercel, add them as environment variables.
3. Publish `firestore.rules` (Firestore → Rules).
4. On the first load, Firestore will ask you to create a composite index (`sectorId` + `createdAt desc`). Click the link in the browser console.

## Data disclaimer
Sector locations are approximate centres. Rents are rough ranges calibrated against 2025–26 listings, and scores are editorial estimates. Metro distance and commute times are computed from approximate coordinates. Always verify in person before renting.

## Stack
React 19 · TypeScript · Vite · react-leaflet · Firebase (lazy-loaded)
