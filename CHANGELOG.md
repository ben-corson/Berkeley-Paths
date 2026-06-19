# Changelog

All notable changes to the Berkeley Paths Navigator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `install.html` — dedicated page with platform-specific PWA install instructions (iOS/Safari, Android/Chrome, Samsung Internet)
- One-tap install prompt for Android/Chrome users via `beforeinstallprompt` API; falls back to instructions page for iOS
- First-visit install prompt modal (shown once, dismissed to localStorage)
- 5 new paths: Arlington Path (#117), Beloit Path (#118), Willamette Path (#119), Lenox Path (#120), Westminster Path (#121)
- geojson.io coordinate editing workflow documented in CONTRIBUTING.md

### Changed
- Renamed "Public Path #2" → Stratford Path
- Renamed "Public Path #1 Path" → Marchant Path
- Renamed "Short Cut" → The Short Cut
- Corrected coordinates for: Easter Way, El Mirador Path, Eunice Steps, Glendale Path, Halkin Walk, Indian Rock Path, La Vereda Steps, Miller Path East, Oak Street Path, Orchard Lane, Rose Walk, Ruth Armstrong Path, Yosemite Steps, Acacia Steps, Acacia Walk, Shasta Path, Coventry Path

### Added (previous)
- Service worker (`sw.js`) for offline caching and automatic updates
  - App assets cached on first visit for offline use
  - iOS home screen users receive code updates automatically without re-adding the app
  - User progress and data in localStorage is preserved across updates
  - Bump `CACHE_NAME` in `sw.js` with each release to deliver updates to existing users
- Compass heading arrow on the location dot in Map view — shows the direction you are facing
- 🧭 button in the top-right of the map to enable device orientation permission (required on iOS)
- Re-center 📍 button in the bottom-right of the map to snap the view back to your location

## [1.0.0] - 2025-01

### Added
- Initial release of Berkeley Paths Navigator
- Interactive map displaying all 105 Berkeley paths
- Path completion tracking with progress bar
- Personal notes for each path
- Geolocation support to show nearby paths
- List and map view modes
- Filter by completed, remaining, nearby, or all paths
- Sort paths alphabetically or by distance
- Berkeley-themed UI with official city colors
- Mobile-responsive design
- iOS home screen app support
- LocalStorage persistence for user data
- Google Maps integration for directions

### Features
- 105 developed Berkeley paths included
- Real-time distance calculation from user location
- Color-coded path visualization (completed, nearby, remaining)
- Click any path to view details and add notes
- Sticky header with progress tracking
- Touch-optimized for mobile devices

---

## Version Format

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner
- **PATCH** version for backwards compatible bug fixes

## Contributing

When making changes:
1. Update this CHANGELOG.md with your changes
2. Follow the format: Added, Changed, Deprecated, Removed, Fixed, Security
3. Include the date when releasing a version
