# Contributing to Berkeley Paths Tracker

Thank you for considering contributing to Berkeley Paths Tracker! This document provides guidelines and instructions for contributing.

## Ways to Contribute

### 1. Report Bugs
- Use GitHub Issues to report bugs
- Include: browser, OS, steps to reproduce, expected vs actual behavior
- Screenshots are helpful!

### 2. Suggest Features
- Open a GitHub Issue with the "enhancement" label
- Explain the use case and benefit
- Discuss before implementing major features

### 3. Update Path Data
If you find incorrect path information:

1. Edit `data/paths-data.json`
2. Verify coordinates using [Berkeley Paths website](https://www.berkeleypath.org/)
3. Test locally to ensure it works
4. Submit a pull request

### 4. Fix Bugs or Add Features
1. Fork the repository
2. Create a branch: `git checkout -b feature/YourFeature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add YourFeature'`
6. Push: `git push origin feature/YourFeature`
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/berkeley-paths-tracker.git
cd berkeley-paths-tracker

# Start local server
python -m http.server 8000
# Or: npx http-server

# Open in browser
open http://localhost:8000
```

## Code Style Guidelines

### JavaScript
- Use ES6+ features
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### CSS
- Use CSS custom properties (variables) for colors
- Follow BEM naming where applicable
- Mobile-first responsive design
- Use Tailwind classes when possible

### React
- Use functional components with hooks
- Keep components focused on single responsibility
- Extract reusable logic into custom hooks
- Use meaningful prop names

## Testing Checklist

Before submitting a PR, verify:

- [ ] Works in Chrome, Firefox, Safari
- [ ] Mobile responsive (test on actual device or devtools)
- [ ] No console errors
- [ ] JSON data validates (run `npm run validate-json`)
- [ ] Geolocation features work correctly
- [ ] LocalStorage persists data properly
- [ ] Map interactions work smoothly
- [ ] All existing features still work

## Path Data Guidelines

When adding or updating paths in `data/paths-data.json`:

```json
{
  "id": 106,                  // Must be unique, sequential
  "name": "Example Path",     // Official path name
  "location": "123 Start St. - 456 End Ave.",  // Clear location
  "start": [37.8792, -122.2595],  // [latitude, longitude]
  "end": [37.8802, -122.2605]     // [latitude, longitude]
}
```

**Important:**
- Always verify coordinates on a map
- Use official path names from berkeleypath.org
- Keep consistent formatting
- Test after adding new paths

## Commit Message Format

Use clear, descriptive commit messages:

```
Add feature: Brief description

Longer explanation if needed.
- Detail 1
- Detail 2

Fixes #123
```

### Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, no logic change)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Pull Request Process

1. **Update Documentation** - README, CHANGELOG, comments
2. **Test Thoroughly** - All features, multiple browsers
3. **Small PRs** - Focus on one feature/fix at a time
4. **Describe Changes** - Clear PR description with context
5. **Link Issues** - Reference related issues
6. **Be Responsive** - Address review feedback promptly

## Questions?

- Open an issue for questions
- Check existing issues and PRs first
- Be respectful and constructive

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Berkeley Paths Tracker! 🎉
