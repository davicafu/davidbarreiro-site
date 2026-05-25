# Design: coordinated mobile + desktop performance pass

## Decision

Decouple initial content render from D3, render hero/H1 immediately, and hydrate `timeline`, `bubbles`, and `flow` after `load`/idle and viewport entry.

## Goal

Improve Lighthouse mobile and desktop without visual redesign, animation loss, or a broad critical-CSS rewrite.

## Quick path

1. Make hero text, images, and headings immediately renderable in `index.html` and `es/index.html`.
2. Split bootstrap into core render vs deferred visuals; D3 must not gate `main.js`.
3. Refactor `timeline.js`, lazy-mount `bubbles.js`/`flow.js`, and move hot images/D3 to local assets.

## Scope

- EN/ES entrypoints.
- JS bootstrap and visual-module loading.
- Timeline reflow reduction.
- Hero/avatar image delivery.
- Heading semantics.

## Non-goals

- Redesigning sections or changing copy hierarchy visually.
- Removing D3-based visuals.
- Rewriting critical CSS.
- Changing resume data shape beyond asset URLs.

## Architecture decisions

| Decision         | Choice                                                                                                               | Rationale                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Core bootstrap   | Start core app without waiting for D3                                                                                | D3 currently blocks hero render and JSON fetch.                           |
| D3 delivery      | Defer D3 through one loader, preferring a same-origin vendored file                                                  | Removes third-party critical dependency without adding a bundler.         |
| Visual hydration | Mount `timeline`/`bubbles`/`flow` after `load` + `requestIdleCallback`, then gate render with `IntersectionObserver` | Preserves animations while removing below-the-fold work from first paint. |
| Heading fix      | Add a semantic capabilities section heading and keep card titles as subordinate headings                             | Fixes Lighthouse/SEO heading order without changing visual layout.        |

## Data flow

`index.html`/`es/index.html` → `main.js` core bootstrap → fetch `resume(.es).json` → render hero/metrics/portfolio immediately → schedule visuals loader → ensure D3 → hydrate visible section.

## Technical decisions by file

| File                                          | Action | Decision                                                                                                                                                                             |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`, `es/index.html`                 | Modify | Keep final hero copy in HTML, add explicit `width`/`height` to avatar and logo, add semantic capabilities heading, and load the core module independently from D3.                   |
| `src/js/main.js`                              | Modify | Split into `bootstrapCore()` and `scheduleVisualHydration()`. Core renders header, metrics, portfolio, and locale fetch; resize work runs only for mounted visuals.                  |
| `src/js/visuals-loader.js`                    | Create | Centralize `ensureD3()`, idle scheduling, and `IntersectionObserver` registration.                                                                                                   |
| `src/js/render.js`                            | Modify | Remove D3 from counters: render final metric values immediately, with optional native enhancement later. Prefer same-origin avatar first.                                            |
| `src/js/timeline.js`                          | Modify | Keep one mobile path, remove the unreachable legacy mobile branch, batch reads before writes, build cards in fragments, and isolate any transition-forcing read to one staged frame. |
| `src/js/bubbles.js`                           | Modify | Render only when `#bubbles` is near viewport; skip offscreen resize work and keep existing interactions once mounted.                                                                |
| `src/js/flow.js`                              | Modify | Same deferred/visible-only strategy as bubbles; no initial D3 work before idle.                                                                                                      |
| `resume.json`, `resume.es.json`, `assets/...` | Modify | Replace the external avatar URL with local optimized variants; keep the local logo assets and explicit dimensions.                                                                   |

## Risks

| Risk                                                   | Mitigation                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Fast scroll reaches a section before hydration         | Use generous `rootMargin` and idle preload after `load`.                          |
| Timeline refactor regresses recent mobile/Safari fixes | Verify against the latest mobile timeline commits and test iOS Safari explicitly. |
| Vendoring D3 increases repo size                       | Commit one minified version; fallback to deferred CDN if vendoring is rejected.   |

## Testing / verification strategy

- Lighthouse mobile + desktop, 3 runs before/after, compare LCP/TBT/INP/CLS.
- Block D3 in DevTools: hero/H1, summary, CTA, and metrics must still render.
- Performance trace on timeline expand/collapse: no recurring forced-layout warnings.
- Manual EN/ES visual check on desktop + mobile; animations must still run after hydration.
- Accessibility/SEO check: heading order, image dimensions, alt text, no new CLS.

## Expected metrics

| Metric                          | Expected change                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| Desktop LCP                     | Improve by ~0.8s-1.5s because hero text is no longer gated by D3/network.                  |
| Mobile LCP                      | Improve by ~0.4s-1.0s from less main-thread work and lighter initial network path.         |
| Initial critical third-party JS | Drop from 1 blocking D3 request to 0.                                                      |
| Timeline layout thrash          | Forced reflow warnings should disappear or be reduced to one intentional transition frame. |
| CLS                             | Stay flat; explicit image dimensions should reduce risk, not raise it.                     |

## Acceptance checklist

- [ ] Hero H1 and summary render before D3 is available in EN and ES.
- [ ] `timeline`, `bubbles`, and `flow` do not run in the critical path.
- [ ] D3 is loaded through one deferred loader, preferably same-origin.
- [ ] `timeline.js` no longer mixes repeated layout reads/writes in the hot path.
- [ ] Capabilities heading hierarchy is semantically valid.
- [ ] Avatar/logo assets use explicit dimensions and same-origin sources where chosen.
- [ ] Lighthouse mobile and desktop improve without visible design regression or animation loss.
