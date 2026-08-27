# Berkeley Paths Navigator

A progressive web app for tracking your progress through all 121 developed paths in Berkeley, California. Features an interactive map, guided routes, completion tracking, and offline support.

## Features

- 📍 **Interactive Map** — View all 121 Berkeley paths with color-coded completion status
- ✅ **Progress Tracking** — Mark paths as completed and track your overall percentage
- 🗺️ **Guided Routes** — 6 curated walking routes with turn-by-turn path guidance
- 📝 **Personal Notes** — Add notes about difficulty, highlights, and memorable moments
- 🧭 **Compass & Location** — Directional arrow shows which way you're facing; follow-me mode centers the map on your location at walking zoom
- 📱 **Home Screen App** — Add to your iPhone home screen for a native app experience with automatic updates
- 💾 **Offline Support** — Works without a connection after first load; route map tiles pre-cached when you open a route

## Getting Started

### Local Development

No build process required. Open `index.html` in a browser, or run a local server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Project Structure

```
berkeley-paths/
├── index.html              # Main HTML (loads React, Leaflet, registers SW)
├── sw.js                   # Service worker (offline caching, tile caching)
├── version.json            # Current version string (never SW-cached)
├── manifest.json           # PWA manifest
├── data/
│   ├── paths-data.json     # All 121 Berkeley paths
│   └── routes-data.json    # 6 curated walking routes with coordinates
├── src/
│   ├── app.jsx             # React application
│   └── styles.css          # Custom CSS
├── assets/
│   └── icon.png            # App icon
└── scripts/
    └── calc_elevation.py   # Utility: calculate elevation gain from USGS API
```

## Pushing Updates to Users

Three files must be bumped together on every push:

| File | What to change |
|------|----------------|
| `sw.js` | `CACHE_NAME = 'berkeley-paths-vN'` |
| `src/app.jsx` | `const VERSION = 'vN'` |
| `version.json` | `{"version":"vN"}` |

The app fetches `version.json` from the network (bypassing the service worker) each time it becomes visible. If the version doesn't match the running app, it clears all caches and reloads. This is the primary update mechanism for iOS home screen apps.

## Map Tiles

The app uses **Stadia Maps Alidade Smooth** tiles — a clean, muted gray style with no API rate limits in normal usage.

The tile style can be changed by updating the `tileLayer` URL in `src/app.jsx`. The same URL must be updated in two places (main map and route map) and in the `preCacheTiles()` function and SW fetch handler.

The service worker caches tiles in a separate persistent cache (`berkeley-paths-tiles`) that survives app updates. When you open a route, tiles for that route's bounding box (zoom 14–17) are pre-fetched in the background so the map works offline while walking.

## Routes

Routes are defined in `data/routes-data.json`. Each route has:
- Metadata: name, distance, elevation gain, difficulty, estimated time
- `route_coordinates`: array of `[lat, lon]` pairs tracing the full loop
- `paths`: the path segments that make up the route (referenced from `paths-data.json`)

To edit route coordinates, export to GeoJSON (converting `[lat, lon]` → `[lon, lat]`), edit in [geojson.io](https://geojson.io), then convert back.

## Elevation Data

Use `scripts/calc_elevation.py` to calculate elevation gain from route coordinates via the USGS National Map Elevation Point Query Service:

```bash
python scripts/calc_elevation.py          # fetch and display
python scripts/calc_elevation.py --update # write results to routes-data.json
python scripts/calc_elevation.py --cached # use cached results only
```

## Deployment

The app is hosted on GitHub Pages. Push to `main` and it deploys automatically.

## Technical Stack

- **React 18** — UI (loaded via CDN, no build step)
- **Leaflet 1.9** — Interactive maps
- **Tailwind CSS** — Pre-built utility styles
- **Stadia Maps** — Map tiles (Alidade Smooth style)
- **Service Worker** — Offline caching and background tile pre-fetch
- **LocalStorage** — User progress and notes persistence
- **USGS EPQS API** — Elevation data for route metadata

## Data Sources

- Path data: [Berkeley Path Wanderers Association](https://www.berkeleypath.org/)
- Elevation: [USGS National Map](https://apps.nationalmap.gov/epqs/)
- Map tiles: [Stadia Maps](https://stadiamaps.com/) / [OpenStreetMap](https://www.openstreetmap.org/)
