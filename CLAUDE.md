# Habitual
Daily habit tracker. 
Live at habitual.themantraproject.com using GitHub Pages + Cloudflare DNS

## Stack
- Pure HTML/CSS/JS 
- No Frameworks, build tools or bundlers
- Google Fonts
- Google Fonts Icons
- Persistence via localStorage only

## File structure
- `/index.html` - Single-page app, all markup lives here
- `/css/style.css` - All styles, including light/dark theming, responsive breakpoints, transitions
- `/js/app.js` - UI logic, rendering, event handling. Wrapped in a single IIFE
- `/js/storage.js` - Data layer (habits, completions, archive). Exposed as a `Storage` module (revealing module pattern via IIFE)
- `/js/quotes.js` - 365 daily rotating motivational quotes (QUOTES array)
- `/assets/` - SVG favicons (light/dark variants), design reference files

## Patterns and conventions
- **No abstraction layers.** DOM elements are grabbed by ID at the top of `app.js`. Rendering functions build elements imperatively with `createElement`. No templating.
- **Module pattern.** `storage.js` uses a revealing module IIFE (`const Storage = (() => { ... })()`). `app.js` uses a plain IIFE for encapsulation.
- **Re-render on change.** After any state mutation (toggle, add, archive, reorder), the relevant render functions are called directly: `renderHabits()`, `updateStats()`, `renderActivityGrid()`. No reactive system.
- **Theming.** Dark mode via `body.dark` class toggle. CSS custom properties or direct selectors handle color switching. Theme preference saved to localStorage, with system preference detection as fallback.
- **Transitions.** All transitions use 0.7s ease timing. Keep this consistent across any new elements.
- **Date keys.** Dates stored as `YYYY-MM-DD` strings. `Storage.formatDateKey()` and `Storage.getTodayKey()` are the source of truth.
- **IDs.** Habit IDs are generated as `h_<timestamp>_<random>`.

## Styling
- All root variables, colours, fonts, and theming are defined at the top of `css/style.css`. Design reference materials live in `assets/`. 
- Pull from those - do not introduce new palettes or typefaces without being asked.

## When making changes
- **Present alternatives.** For any design change or new feature, briefly outline the modern best-practice approach (what tools/patterns would typically be used and why) alongside the vanilla implementation that fits this codebase. Let the user decide which direction to take.
- **Reliability over speed.** Prioritise correct, well-tested code over fast delivery. Think through edge cases before writing.
- Keep it vanilla unless the user opts for a different approach after seeing alternatives.
- Do not refactor working code unless asked. This project iterates through visual refinement, not architectural rewrites.
- Test both light and dark themes when touching styles.
- Responsive layout: sidebar on desktop, hamburger menu + slide-in on mobile, FAB for quick add. Test both.
- localStorage is the only persistence. No server, no API calls.
