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

## Routes Feature (in-progress — `routes-feature` branch)

A curated Routes tab that strings multiple paths together into guided walks. Based on the official Berkeley Path Wanderers walks.

**What's already built:**
- `data/routes-data.json` with 4 curated routes, each including name, distance, estimated time, difficulty, elevation gain, path count, start location, full route coordinates, and a link to the official PDF itinerary
- A third `Routes` tab in the navigation alongside Map and List
- Routes rendered as polylines on the map with a start marker
- Map auto-fits to the selected route bounds

**The 4 routes:**
| Route | Distance | Time | Difficulty | Paths |
|---|---|---|---|---|
| Walk 1: Hills Loop | 5 mi | 2–3 hrs | Moderate–Difficult | 17 |
| Walk 2: North Berkeley Hills | 4.5 mi | 2–2.5 hrs | Moderate | 15 |
| Walk 3: Panoramic Hill | 5 mi | 2–2.5 hrs | Moderate–Difficult | 18 |
| Walk 4: Elmwood & Claremont | 4 mi | 2–2.5 hrs | Moderate | 12 |

**Still to do before merging:**
- Per-route completion tracking (X of Y paths in this route completed)
- Route completion milestone/achievement
- Sync route path highlighting with user's completed paths
- Reconcile any coordinate/path updates made on `main` since the branch diverged

## Notes

- All localStorage-based features scale to any number of users at zero cost (see scalability notes in README)
- Features requiring cross-device sync or aggregate stats would need a backend
