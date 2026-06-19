# Future Development Ideas

Potential features for Berkeley Paths Navigator, roughly in order of implementation effort.

## High Value, Low Effort

- **Share progress** — a "Share" button that generates a simple text like "I've completed 47/121 Berkeley paths! 🗺️" for iMessage/social
- **Path notes** — let users jot a quick note on each path ("great views", "bring water") stored in localStorage
- **Sort by nearest** — sort the main path list by distance from current location, not just the Nearby Paths section

## Medium Effort, High Delight

- **Streak tracking** — "You've walked 3 paths this week!" with a small streak counter in the header
- **Random path picker** — a "Surprise me!" button that picks a nearby incomplete path
- **Date completed** — record when each path was finished, show it in the path detail view

## Bigger Lifts

- **Photo notes** — attach a photo to a completed path (stored as base64 in localStorage, no server needed)
- **Custom path collections** — let users group paths ("favorites", "with kids", "great views")

## Notes

- All localStorage-based features scale to any number of users at zero cost (see scalability notes in README)
- Features requiring cross-device sync or aggregate stats would need a backend
