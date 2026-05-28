# Berkeley Paths Navigator

A progressive web app for tracking your progress through all 105 developed paths in Berkeley, California. Features an interactive map, completion tracking, and personal notes for each path.

## Features

- 📍 **Interactive Map** - View all 105 Berkeley paths on an interactive map with visual indicators
- ✅ **Progress Tracking** - Mark paths as completed and track your overall completion percentage
- 📝 **Personal Notes** - Add notes about difficulty, highlights, and memorable moments for each path
- 🗺️ **Location-Aware** - See your current location and find nearby paths within 0.5 miles
- 🧭 **Compass Heading** - The location dot shows a directional arrow indicating which way you're facing; tap the 🧭 button to enable (requires device orientation permission on iOS)
- 🎨 **Berkeley Themed** - Official City of Berkeley burgundy and gold color scheme
- 📱 **Mobile Optimized** - Add to your iPhone/Android home screen for a native app experience
- 💾 **Persistent Storage** - All your progress is saved locally in your browser

## Getting Started

### Quick Start

1. Open `index.html` in a web browser
2. Allow location access for the best experience
3. Start exploring Berkeley's paths!

### Local Development

No build process required! Just open `index.html` directly in your browser or use a simple HTTP server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## Project Structure

```
berkeley-paths-tracker/
├── index.html              # Main HTML file (minimal, loads other files)
├── sw.js                   # Service worker (offline caching & auto-updates)
├── manifest.json           # PWA manifest (icon, display mode, theme)
├── data/
│   └── paths-data.json    # All 105 Berkeley paths data
├── src/
│   ├── app.jsx            # React application code
│   └── styles.css         # CSS styling
├── assets/
│   └── icon.png           # App icon for mobile devices
├── README.md              # This file
├── CHANGELOG.md           # Version history
└── .gitignore            # Git ignore rules
```

## Updating Path Data

To add or modify paths, edit `data/paths-data.json`:

```json
{
  "id": 106,
  "name": "New Path Name",
  "location": "Start Address - End Address",
  "start": [37.8792, -122.2595],
  "end": [37.8802, -122.2605]
}
```

- `id`: Unique identifier (integer)
- `name`: Path name (string)
- `location`: Descriptive location (string)
- `start`: [latitude, longitude] coordinates
- `end`: [latitude, longitude] coordinates

## Customization

### Colors
Edit `src/styles.css` to change the color scheme:
```css
:root {
    --berkeley-burgundy: #941B1E;
    --berkeley-gold: #EAA636;
}
```

### Map Style
Edit the tile layer URL in `src/app.jsx` (line ~245):
```javascript
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    // Change this URL to use a different map style
})
```

## Deployment

### GitHub Pages

1. Push your code to GitHub
2. Go to Settings > Pages
3. Select your branch and `/root` folder
4. Your app will be live at `https://yourusername.github.io/berkeley-paths-tracker/`

### Netlify/Vercel

Simply drag and drop the entire folder to Netlify or connect your GitHub repo to Vercel.

## Pushing Updates to Users

The app uses a service worker (`sw.js`) to cache files on users' devices. This means:
- The app works offline after the first visit
- Users on iOS home screen get updates automatically — they don't need to re-add the app
- User progress (completed paths, notes) is never lost during an update

**Every time you push a code change, bump the cache version in `sw.js`:**

```js
// Change this each release:
const CACHE_NAME = 'berkeley-paths-v1'; // → v2, v3, etc.
```

This tells users' devices to fetch the new version. If you forget to bump it, some users may continue running the old version from cache.

## Data Sources

Path data is sourced from the official [Berkeley Paths website](https://www.berkeleypath.org/), which maintains information about all developed paths in Berkeley.

## Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari (iOS 12+)
- ✅ Mobile browsers

## Technical Stack

- **React 18** - UI framework
- **Leaflet** - Interactive maps
- **Tailwind CSS** - Utility-first styling
- **LocalStorage** - Data persistence
- **Geolocation API** - Location tracking

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- City of Berkeley for maintaining the paths
- Berkeley Path Wanderers Association
- OpenStreetMap contributors

## Version

Current version: 1.0.0

See [CHANGELOG.md](CHANGELOG.md) for version history.
