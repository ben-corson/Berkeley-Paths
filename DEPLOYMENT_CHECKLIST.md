# Berkeley Paths Tracker - Deployment Checklist ✅

Use this checklist when preparing your app for deployment or making updates.

## 📋 Pre-Deployment Checklist

### 1. Code Quality
- [ ] All files are properly formatted
- [ ] No console errors in browser
- [ ] JSON validates: `npm run validate-json`
- [ ] All paths display correctly on map
- [ ] List view shows all paths
- [ ] Filter options work (All, Nearby, Completed, Remaining)
- [ ] Sort options work (Distance, A-Z)

### 2. Functionality Testing
- [ ] Path completion toggles work
- [ ] Notes save and persist
- [ ] Progress bar updates correctly
- [ ] Google Maps directions link works
- [ ] Geolocation requests permission
- [ ] Map centers on paths when clicked
- [ ] Modal opens/closes properly
- [ ] LocalStorage persists data between sessions

### 3. Responsive Design
- [ ] Works on desktop (Chrome, Firefox, Safari)
- [ ] Works on mobile (iOS Safari, Chrome)
- [ ] Touch interactions work smoothly
- [ ] Map is usable on small screens
- [ ] Text is readable at all sizes
- [ ] Buttons are touch-friendly (44px minimum)

### 4. Documentation
- [ ] README.md is up to date
- [ ] CHANGELOG.md has latest version
- [ ] package.json version is correct
- [ ] All links work
- [ ] No broken images

### 5. Assets
- [ ] Icon.png exists and displays
- [ ] All images optimized
- [ ] External CDN links work

## 🚀 Deployment Steps

### Option A: GitHub Pages

1. **Initialize Git** (if not already)
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Berkeley Paths Tracker"
   ```

2. **Create GitHub Repository**
   - Go to github.com/new
   - Create new repository: `berkeley-paths-tracker`
   - Don't initialize with README (you already have one)

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/berkeley-paths-tracker.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**
   - Go to repository Settings
   - Scroll to "Pages" section
   - Source: Deploy from branch
   - Branch: main, folder: / (root)
   - Save

5. **Wait & Test**
   - GitHub Pages deployment takes 1-2 minutes
   - Visit: `https://yourusername.github.io/berkeley-paths-tracker/`

### Option B: Netlify Drop

1. **Create Build** (optional)
   ```bash
   bash scripts/build.sh
   ```

2. **Deploy**
   - Go to netlify.com/drop
   - Drag and drop your folder
   - Get instant live URL

3. **Custom Domain** (optional)
   - Go to Domain settings
   - Add custom domain
   - Update DNS records

### Option C: Vercel

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```
   Or: Connect GitHub repo in Vercel dashboard

## 🔄 Update Workflow

### Making Changes

1. **Edit Files Locally**
   - Update `data/paths-data.json` for path changes
   - Update `src/app.jsx` for feature changes
   - Update `src/styles.css` for styling

2. **Test Locally**
   ```bash
   python -m http.server 8000
   # Test at http://localhost:8000
   ```

3. **Update Documentation**
   - Add entry to CHANGELOG.md
   - Update README.md if needed
   - Increment version in package.json

4. **Commit & Push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

5. **Verify Deployment**
   - Check live site
   - Test all changed features
   - Verify on mobile

## 📝 Common Update Tasks

### Add New Paths

1. Edit `data/paths-data.json`
2. Add new path object(s)
3. Test locally
4. Update `totalPaths` in config.json if needed
5. Commit and push

### Change Colors

1. Edit `src/styles.css`
2. Modify CSS custom properties
3. Test in browser
4. Commit and push

### Fix Bugs

1. Identify bug
2. Fix in appropriate file
3. Test thoroughly
4. Update CHANGELOG.md
5. Commit with descriptive message
6. Push

## 🐛 Troubleshooting

### Paths Not Showing
- Check browser console for errors
- Verify paths-data.json is valid JSON
- Check file paths in index.html
- Verify CDN links work

### Map Not Loading
- Check internet connection
- Verify Leaflet CDN is accessible
- Check browser console for errors
- Try clearing cache

### Changes Not Appearing
- Hard refresh: Cmd+Shift+R or Ctrl+Shift+R
- Clear browser cache
- Check file was saved
- Verify deployment completed

### GitHub Pages Not Updating
- Check Actions tab for build status
- Verify branch settings are correct
- Wait a few minutes (can take time)
- Check if there are any errors

## ✅ Post-Deployment

- [ ] Visit live URL and test
- [ ] Test on mobile device
- [ ] Share with friends/testers
- [ ] Monitor for any issues
- [ ] Update social links if applicable
- [ ] Add site to search engines (optional)

## 📊 Metrics to Track

- Number of paths completed by users
- Most popular paths
- Feature usage (map vs list view)
- Mobile vs desktop usage
- User feedback and bug reports

## 🎯 Best Practices

1. **Always test locally first**
2. **Keep commits small and focused**
3. **Write clear commit messages**
4. **Update documentation with code**
5. **Back up your data regularly**
6. **Monitor for issues after deployment**
7. **Respond to user feedback**

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Review README.md and documentation
3. Check existing GitHub issues
4. Open new issue with details
5. Include: browser, OS, steps to reproduce

---

## 🎉 You're Ready to Deploy!

Follow this checklist each time you deploy or make updates to ensure a smooth process.

**Remember:** Test locally before deploying, and always keep your documentation up to date!
