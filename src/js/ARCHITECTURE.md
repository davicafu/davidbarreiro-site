# JS Module Architecture

## Entry point
- `src/js/main.js`
  - Loads `resume.json`
  - Runs schema validation warnings
  - Orchestrates rendering and resize re-renders

## Shared state and constants
- `src/js/state.js`
  - App-level constants (`PDF_MODE`, `reducedMotion`, `palette`, etc.)
  - Mutable app state (`appState.resumeData`, `appState.jobs`, `appState.skillGroups`, `appState.flow`)

## Utilities
- `src/js/utils.js`
  - `safeText`, `isHttpUrl`, `normalizeKeywordItem`
  - `parseDateToYear`, `deriveFlow`
  - `validateResumeData`

## UI primitives
- `src/js/ui.js`
  - Tooltip lifecycle: `showTip`, `hideTip`

## Rendering/data mapping
- `src/js/render.js`
  - `mapResumeToViewModel` maps `resume.json` into `appState`
  - Hero, metrics, portfolio, legend, keyword panel

## D3 visual modules
- `src/js/timeline.js`
  - Experience + education timeline rendering and interactions
- `src/js/bubbles.js`
  - Skill bubbles pack layout and interactions
- `src/js/flow.js`
  - System design flow layout and interactions

## Dependency graph
- `main.js` -> `state.js`, `utils.js`, `render.js`, `timeline.js`, `bubbles.js`, `flow.js`
- `render.js` -> `state.js`, `utils.js`
- `timeline.js` -> `state.js`, `utils.js`, `ui.js`
- `bubbles.js` -> `state.js`, `utils.js`, `ui.js`, `render.js`
- `flow.js` -> `state.js`

## Notes
- D3 is loaded globally from CDN in `index.html`.
- `appState` is the single mutable store shared across modules.
- For stricter isolation, next step would be dependency injection of state into modules.