# Habitual
Daily habit tracker. 
Live at habitual.themantraproject.com using GitHub Pages + Cloudflare DNS

## Stack
- Pure HTML/CSS/JS 
- No Frameworks, build tools or bundlers
- Google Fonts
- Google Fonts Icons
- Persistence via localStorage, with optional cross-device sync through a Cloudflare Worker backed by Cloudflare KV
- Installable PWA: service worker for offline caching, web app manifest

## File structure
- `/index.html` - Single-page app, all markup lives here
- `/css/style.css` - All styles, including light/dark theming, responsive breakpoints, transitions
- `/js/app.js` - UI logic, rendering, event handling. Wrapped in a single IIFE
- `/js/storage.js` - Data layer (habits, completions, archive, training blocks, sync export/import). Exposed as a `Storage` module (revealing module pattern via IIFE)
- `/js/sync.js` - Pulls and pushes the full data set to the sync Worker. Exposed as a `Sync` module (revealing module pattern via IIFE)
- `/js/quotes.js` - 365 daily rotating motivational quotes (QUOTES array)
- `/sw.js` - Service worker. Serves the files in `STATIC_ASSETS` cache-first
- `/manifest.json` - PWA manifest (name, theme colours, icons)
- `/worker/sync-worker.js` - Cloudflare Worker source for the sync API. Deployed to Cloudflare separately; pushing to GitHub does not update it
- `/assets/` - SVG favicons and PNG app icons (light/dark variants), design reference files

## Patterns and conventions
- **No abstraction layers.** DOM elements are grabbed by ID at the top of `app.js`. Rendering functions build elements imperatively with `createElement`. No templating.
- **Module pattern.** `storage.js` and `sync.js` use a revealing module IIFE (`const Storage = (() => { ... })()`). `app.js` uses a plain IIFE for encapsulation.
- **Re-render on change.** After any state mutation (toggle, add, archive, reorder), the relevant render functions are called directly: `renderHabits()`, `updateStats()`, `renderActivityGrid()`. No reactive system.
- **Sync.** State mutations end with `Sync.push()` (debounced 500ms), usually via `afterMutation()` in `app.js`. On load, `Sync.pull()` replaces local data only when the remote `lastModified` is newer. Sync only runs when a token is stored (set once via `?token=` in the URL); without one the app runs on localStorage alone. Any new persisted data must be added to both `Storage.exportAll()` and `Storage.importAll()` or it will not sync.
- **Service worker cache.** When adding a static file, add it to `STATIC_ASSETS` in `sw.js`. When changing any cached file, bump `CACHE_VERSION`, or returning visitors keep the old version.
- **Theming.** Dark mode via `body.dark` class toggle. CSS custom properties or direct selectors handle color switching. Theme preference saved to localStorage, with system preference detection as fallback.
- **Transitions.** Theme colour changes (background, text, border) use 0.7s ease so light/dark switching fades smoothly. Hover and interaction feedback uses short durations (0.1s to 0.4s ease). Follow the same split for new elements.
- **Date keys.** Dates stored as `YYYY-MM-DD` strings. `Storage.formatDateKey()` and `Storage.getTodayKey()` are the source of truth.
- **IDs.** Habit IDs are generated as `h_<timestamp>_<random>`.

## Styling
- All root variables, colours, fonts, and theming are defined at the top of `css/style.css`. Design reference materials live in `assets/`. 
- Use those tokens. Do not add new colours or typefaces without being asked.

## When making changes
- Keep it vanilla unless the user opts for a different approach after seeing alternatives.
- Responsive layout: sidebar on desktop, hamburger menu + slide-in on mobile, FAB for quick add.
- Every change must work in both light and dark themes, and at desktop and mobile widths.
- localStorage is the primary store. The app must work fully without the sync Worker (offline, or no token). Do not add other servers or API calls.
