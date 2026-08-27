# Changelog

All notable changes to the Berkeley Paths Navigator will be documented in this file.

## [Unreleased]

## [2.0.0] - 2026

### Added
- **Routes view** — 6 curated walking routes with metadata (distance, elevation gain, difficulty, estimated time, path count)
- Route map shows the full route as a purple polyline with path segments highlighted in gold/burgundy
- White casing technique: route line is visually hidden where paths run, so path colors show through cleanly
- Click any path segment on the route map to mark it complete
- Follow-me mode (📍 button): centers route map on your location at zoom 17 while walking
- Compass button (🧭) on route map shows directional heading arrow on your location dot
- Route coordinates calculated from real GPS traces; elevation gain from USGS EPQS API
- **Tile pre-caching**: when you open a route, map tiles for that area (zoom 14–17) are fetched in the background so the map works offline while walking
- Tile cache is persistent across app updates (separate from the app asset cache)
- `version.json` out-of-band update check: app detects new versions as soon as it becomes visible and reloads automatically — reliable on iOS home screen apps
- `scripts/calc_elevation.py` utility for calculating elevation gain from route coordinates via USGS API

### Changed
- Map tiles switched from Carto (deprecated free tier) → OSM → Esri → OSM Humanitarian → **Stadia Maps Alidade Smooth** (clean gray, zoom 20, free tier)
- Service worker now uses `skipWaiting` for immediate activation on update
- App title corrected to "Berkeley Paths Navigator" (was "Tracker" in some places)
- Removed "View Turn-by-Turn Directions" button from route detail view

### Fixed
- Route map not re-rendering when switching between routes (cleanup effect now watches `selectedRoute`)
- Path colors not updating after marking complete in Routes view
- Compass and pin buttons hidden behind Leaflet map layers (switched from Tailwind `z-10` to inline `style={{ zIndex: 9999 }}`)
- Directional arrow missing on route map (was showing plain blue dot)
- Infinite reload loop caused by `version.json` being served from SW cache
- White gap at path/non-path junctions (fixed with `lineCap: 'butt'` on white casing)

## [1.1.0] - 2025

### Added
- `install.html` — dedicated PWA install instructions page (iOS/Safari, Android/Chrome)
- First-visit install prompt modal
- 5 new paths: Arlington (#117), Beloit (#118), Willamette (#119), Lenox (#120), Westminster (#121)
- Service worker for offline caching and automatic updates
- Compass heading arrow on location dot
- 🧭 button to enable device orientation permission on iOS
- 📍 re-center button on the map

### Changed
- Renamed several paths to match official names (Stratford, Marchant, The Short Cut)
- Corrected coordinates for ~15 paths

## [1.0.0] - 2025-01

### Added
- Initial release
- Interactive map with all 105 Berkeley paths
- Path completion tracking with progress bar
- Personal notes per path
- Geolocation and nearby path detection
- List and map view modes
- Filter and sort (alphabetical, distance, completion status)
- Berkeley-themed UI (burgundy and gold)
- Mobile-responsive design, iOS home screen support
- LocalStorage persistence
