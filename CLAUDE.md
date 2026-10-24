# Habitual
Daily habit tracker with a training dashboard.
Live at habitual.themantraproject.com using GitHub Pages + Cloudflare DNS

**This repo is public and GitHub Pages serves every committed file.** Never commit secrets, tokens, API keys, `.dev.vars`, or personal data (Hevy/Garmin payloads, health metrics, exports). `docs/TRAINING.md` is deliberately local-only: it's excluded through `.git/info/exclude` and must never be committed.

## Stack
- Pure HTML/CSS/JS 
- No Frameworks, build tools or bundlers
- Google Fonts
- Google Fonts Icons
- Persistence via localStorage, with optional cross-device sync through a Cloudflare Worker backed by Cloudflare KV
- Installable PWA: service worker for offline caching, web app manifest
- Training data (being built — see `docs/TRAINING.md`): a second Cloudflare Worker, `habitual-training`, backed by Cloudflare D1

## File structure
- `/index.html` - Single-page app, all markup lives here
- `/css/style.css` - All styles, including light/dark theming, responsive breakpoints, transitions
- `/js/app.js` - UI logic, rendering, event handling. Wrapped in a single IIFE
- `/js/storage.js` - Data layer (habits, completions, archive, training blocks, sync export/import). Exposed as a `Storage` module (revealing module pattern via IIFE). The training-block code is legacy and is deleted in `docs/TRAINING.md` Phase 2
- `/js/sync.js` - Pulls and pushes the full data set to the sync Worker. Exposed as a `Sync` module (revealing module pattern via IIFE)
- `/js/quotes.js` - 365 daily rotating motivational quotes (QUOTES array)
- `/sw.js` - Service worker. Serves the files in `STATIC_ASSETS` cache-first
- `/manifest.json` - PWA manifest (name, theme colours, icons)
- `/worker/sync-worker.js` - Cloudflare Worker source for the sync API. Deployed to Cloudflare separately; pushing to GitHub does not update it
- `/worker/training/` - `habitual-training` Worker: `src/`, `migrations/`, `wrangler.toml`. Deployed with Wrangler; pushing to GitHub does not update it
- `/docs/TRAINING.md` - Build plan for the Training section. **Local only, not in the repo.** Read it before any training work
- `/assets/` - SVG favicons and PNG app icons (light/dark variants), design reference files

## Patterns and conventions
- **No abstraction layers.** DOM elements are grabbed by ID at the top of `app.js`. Rendering functions build elements imperatively with `createElement`. No templating.
- **Module pattern.** `storage.js` and `sync.js` use a revealing module IIFE (`const Storage = (() => { ... })()`). `app.js` uses a plain IIFE for encapsulation.
- **Re-render on change.** After any state mutation (toggle, add, archive, reorder), the relevant render functions are called directly: `renderHabits()`, `updateStats()`, `renderActivityGrid()`. No reactive system.
- **Sync.** State mutations end with `Sync.push()` (debounced 500ms), usually via `afterMutation()` in `app.js`. On load, `Sync.pull()` replaces local data only when the remote `lastModified` is newer. Sync only runs when a token is stored (set once via `?token=` in the URL); without one the app runs on localStorage alone. Any new persisted *habit* data must be added to both `Storage.exportAll()` and `Storage.importAll()` or it will not sync.
- **Training data is the exception — never add it to `exportAll()` or `importAll()`.** It's written by the training Worker into D1 and read back through its API. The habit sync is whole-blob, last-write-wins, so anything server-written placed in it would be overwritten by the next push from a device that doesn't have it. Client-side caches of training API responses use their own localStorage keys that are not exported.
- **Service worker cache.** When adding a static file, add it to `STATIC_ASSETS` in `sw.js`. When changing any cached file, bump `CACHE_VERSION`, or returning visitors keep the old version.
- **Theming.** Dark mode via `body.dark` class toggle. CSS custom properties or direct selectors handle color switching. Theme preference saved to localStorage, with system preference detection as fallback.
- **Transitions.** Theme colour changes (background, text, border) use 0.7s ease so light/dark switching fades smoothly. Hover and interaction feedback uses short durations (0.1s to 0.4s ease). Follow the same split for new elements.
- **Date keys.** Dates stored as `YYYY-MM-DD` strings. `Storage.formatDateKey()` and `Storage.getTodayKey()` are the source of truth. The training Worker computes the same format in Europe/London.
- **IDs.** Habit IDs are generated as `h_<timestamp>_<random>`.

## Styling
- All root variables, colours, fonts, and theming are defined at the top of `css/style.css`. Design reference materials live in `assets/`. 
- Use those tokens. Do not add new colours or typefaces without being asked.

## Workers
- Both Workers authenticate with the same bearer token (`Sync.getToken()`). The token is the security boundary: the page shell is public and holds no data. Do not add client-side passcodes or password gates.
- Secrets via `wrangler secret put` remotely and `.dev.vars` locally (gitignored). Never ask the user to paste a secret value into the session.
- D1 schema changes are new numbered migrations in `worker/training/migrations/`. Never edit a migration that has been applied remotely.
- **Never use `INSERT OR REPLACE` on parent tables** (`workouts`, `exercises`). It deletes the existing row first, and `ON DELETE CASCADE` silently wipes every child set. Use `INSERT ... ON CONFLICT(...) DO UPDATE`.
- All D1 queries use bound parameters (`.bind()`). No string-built SQL.
- Derived training metrics (e1RM, tonnage, rolling averages) live in D1 views. Do not recompute them in the Worker or the client.
- Do not modify or redeploy `habitual-sync` unless explicitly asked.

## When making changes
- Keep it vanilla unless the user opts for a different approach after seeing alternatives.
- Responsive layout: sidebar on desktop, hamburger menu + slide-in on mobile, FAB for quick add.
- Every change must work in both light and dark themes, and at desktop and mobile widths.
- localStorage is the primary store for habits. Habits must work fully without any Worker (offline, or no token). The Training view needs the training API but must degrade gracefully: cached data when offline, clear guidance when there's no token. Do not add servers or API calls beyond the two Workers.
- **The Training section is being replaced, not extended.** Do not reuse, adapt or build on the existing block-tracker code, markup, CSS or storage keys. Follow `docs/TRAINING.md` phase by phase, on the `training-v2` branch, and stop at each phase's acceptance criteria to confirm with the user before starting the next.
