# Berkeley Paths Navigator - Quick Start Guide

## 🎯 What You Got

Your Berkeley Paths Navigator is now organized into a professional repo structure with:

### Core Files
- **index.html** - Minimal HTML that loads everything
- **data/paths-data.json** - All 105 paths (easy to update!)
- **src/app.jsx** - React application code
- **src/styles.css** - Stylesheet
- **assets/icon.png** - App icon

### Documentation
- **README.md** - Complete project documentation
- **CHANGELOG.md** - Version history
- **CONTRIBUTING.md** - Contribution guidelines

### Utilities
- **.gitignore** - Git ignore rules

## 🚀 How to Use It

### Updating Path Data
Just edit `data/paths-data.json`:
```json
{
  "id": 106,
  "name": "New Path",
  "location": "Start - End",
  "start": [37.8792, -122.2595],
  "end": [37.8802, -122.2605]
}
```

### Changing Colors
Colors must be updated in two places:

1. **`index.html`** — Tailwind config (controls the UI):
```js
'berkeley-burgundy': '#941B1E',
'berkeley-burgundy-dark': '#6B1214',
'berkeley-gold': '#EAA636',
```

2. **`src/app.jsx`** — `COLORS` constant at the top (controls map colors):
```js
const COLORS = { burgundy: '#941B1E', burgundyDark: '#6B1214', gold: '#EAA636' };
```

Also update `--bg-gradient-start` / `--bg-gradient-end` in `src/styles.css` if changing the burgundy shades.

### Testing Locally
```bash
# Navigate to the directory
cd berkeley-paths-tracker

# Start a local server (pick one)
python -m http.server 8000
# OR
npx http-server
# OR
php -S localhost:8000

# Open browser
open http://localhost:8000
```

## 📤 Deployment Options

### GitHub Pages
1. Push to GitHub
2. Settings → Pages
3. Select branch → Save
4. Done! Live at `username.github.io/berkeley-paths-tracker`

### Netlify
1. Drag folder to netlify.com/drop
2. Done!

### Vercel
1. Connect GitHub repo
2. Deploy automatically

## 🔧 Making Updates

### Add a New Path
1. Edit `data/paths-data.json`
2. Add new path object
3. Refresh browser - it just works!

### Modify the UI
1. Edit `src/app.jsx` for functionality
2. Edit `src/styles.css` for styling
3. **Bump the cache version in `sw.js`** (e.g. `berkeley-paths-v1` → `berkeley-paths-v2`)
4. Commit and push — users get the update automatically

### Update Documentation
1. Keep `README.md` current
2. Add entries to `CHANGELOG.md`

## 🎨 Key Benefits of This Structure

✅ **Easy Updates** - Change data without touching code
✅ **Better Organization** - Each file has one purpose
✅ **Version Control** - See exactly what changed
✅ **Collaboration** - Multiple people can work on different files
✅ **Professional** - Standard patterns developers recognize
✅ **Scalable** - Easy to add new features

## 📁 File Purposes

| File | Purpose | Update When |
|------|---------|-------------|
| `data/paths-data.json` | Path information | Adding/updating paths |
| `src/app.jsx` | App logic | Adding features |
| `src/styles.css` | Styling | Changing appearance |
| `sw.js` | Service worker / caching | Every code release (bump cache version) |
| `index.html` | Page structure | Adding dependencies |
| `README.md` | Documentation | Project changes |
| `CHANGELOG.md` | Version history | Releases |

## 🐛 Troubleshooting

**Paths not showing?**
- Check browser console for errors
- Verify JSON is valid: `python -m json.tool data/paths-data.json`
- Check file paths are correct

**Map not loading?**
- Check internet connection (needs Leaflet CDN)
- Verify coordinates are in correct format [lat, lng]

**Changes not appearing?**
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Clear browser cache
- Check file was saved
- If using the iOS home screen app: make sure you bumped the cache version in `sw.js` and pushed — the service worker will deliver the update on next open

## 💡 Tips

1. **Always test locally** before deploying
2. **Commit often** with clear messages
3. **Keep paths-data.json clean** - consistent formatting
4. **Update CHANGELOG.md** when making releases
5. **Reference issues** in commit messages (#123)

## 📚 Next Steps

1. **Test the app** - Open index.html and try it out
2. **Push to GitHub** - Initialize git and push
3. **Deploy** - Use GitHub Pages, Netlify, or Vercel
4. **Customize** - Make it yours!
5. **Share** - Let others explore Berkeley paths

## 🆘 Need Help?

- Check README.md for detailed docs
- See CONTRIBUTING.md for guidelines
- Open GitHub issue for questions
- Review existing code comments

---

**Remember:** The main benefit is that you can now update path data without touching any HTML or JavaScript. Just edit the JSON file and reload!
