# 🌙 Dark Mode Implementation Guide for Berkeley Paths

## Quick Setup (3 steps)

### Step 1: Replace your styles.css
Replace your current `styles.css` file with the new one provided (`styles.css`).

The new file includes:
- All your existing Berkeley brand colors
- Dark mode color scheme with Berkeley gold accents
- Smooth transitions between modes
- Map filter adjustments for dark mode
- Toggle button styling

### Step 2: Add the JavaScript file
Add the `dark-mode.js` file to your project in the same directory as your HTML file.

### Step 3: Link the JavaScript in your HTML
Add this line before the closing `</body>` tag in your `index.html`:

```html
<script src="dark-mode.js"></script>
</body>
</html>
```

## That's it! 🎉

Your site will now:
- ✅ Show a toggle button in the top-right corner
- ✅ Remember user preference across sessions
- ✅ Automatically detect system dark mode preference
- ✅ Support keyboard shortcut (press 'D' to toggle)
- ✅ Maintain Berkeley brand colors in both modes

## What Changed

### Light Mode (Default)
- Burgundy gradient background (as before)
- White/light cards and content
- Berkeley gold accents

### Dark Mode
- Dark gradient background (#0a0a0a → #1a1a1a)
- Dark cards (#1e1e1e)
- Berkeley gold accents remain vibrant
- Map has slight filter for better visibility

## Customization

### Change Toggle Button Position
In `styles.css`, find `.dark-mode-toggle` and adjust:
```css
.dark-mode-toggle {
    top: 20px;      /* Change this */
    right: 20px;    /* Change this */
}
```

### Adjust Dark Mode Colors
In `styles.css`, modify the `body.dark-mode` section:
```css
body.dark-mode {
    --bg-gradient-start: #0a0a0a;  /* Background start */
    --bg-gradient-end: #1a1a1a;    /* Background end */
    --card-bg: rgba(30, 30, 30, 0.95);  /* Card backgrounds */
    /* etc. */
}
```

### Remove Keyboard Shortcut
In `dark-mode.js`, delete or comment out this section:
```javascript
// Optional: Keyboard shortcut (press 'D' to toggle dark mode)
document.addEventListener('keydown', function(e) {
    // ... (delete this entire section)
});
```

## Testing

1. **Upload to GitHub:**
   ```bash
   git add styles.css dark-mode.js index.html
   git commit -m "Add dark mode support"
   git push
   ```

2. **Test the features:**
   - Click the toggle button in top-right
   - Refresh page - your preference should persist
   - Press 'D' key to toggle
   - Change system dark mode - should auto-adjust

3. **Test on mobile:**
   - Button should be accessible on mobile
   - Touch/tap should work smoothly

## Troubleshooting

**Button not appearing?**
- Check browser console (F12) for errors
- Ensure dark-mode.js is loaded after page content
- Verify the script path is correct

**Colors look wrong?**
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check that styles.css is properly linked in HTML

**Map looks weird?**
- Adjust the `--map-filter` variable in styles.css
- Try `brightness(0.75)` or `none` if current filter doesn't work

## Files Included

1. **styles.css** - Updated stylesheet with dark mode
2. **dark-mode.js** - Toggle functionality
3. This README file

## Support

Your Berkeley Paths site will maintain its beautiful brand identity in both modes while giving users the choice of their preferred viewing experience!
