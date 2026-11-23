# Portfolio alternatives (/v2 and redesign options)

Goal: offer an improved version of the current site and several redesign options on separate routes, without changing `/` or `/es/`.
Branch: `feat/portfolio-alternatives`. Checks: `pnpm run lint`, `pnpm run build`, `node --test tests/**/*.test.js`, plus a visual check with `impeccable shot`.

## Specs

- S1 (L1): "quiero la mejorada" — `/v2/` and `/es/v2/` keep the current visual language and every feature, and apply the fixes from the 2026-11-22 critique (`.impeccable/critique/`).
- S2 (L1): "varias opciones para elegir una nueva" — three redesign previews with real `resume.json` content on separate routes, for the owner to pick one.
- S3 (L0, original request): "tiene que tener las mismas funcionalidades" — the chosen redesign is completed later with full feature parity. The previews are explicitly partial.
- S4 (L0): "en otro endpoint para no estropear lo que ya tenemos" — the rendered output of `/` and `/es/` must stay unchanged.
- S5 (assumption): alternative routes are `noindex` and point their canonical at the main pages, so search engines do not see duplicate content.

## Tasks

| ID  | Specs      | Route  | Status                        | Evidence |
| --- | ---------- | ------ | ----------------------------- | -------- |
| T1  | S1, S4, S5 | inline | done                          | L4       |
| T2  | S2, S4, S5 | inline | done                          | L5, L6   |
| T3  | S3         | inline | blocked on the owner's choice |          |
| T4  | S2, S4, S5 | inline | done                          | L7, L8   |
| T5  | S2, S4, S5 | inline | done                          | L9, L10  |
| T6  | S2, S4, S5 | delegated (parallel writers, disjoint surfaces) | in progress | L9 |

## Non-goals

- Changing the shared client JS (`src/js/`). Keyboard access for the D3 visuals and the 29-tag filter need it, so they are listed as open items for the owner to approve.
- Changing `resume.json` content. Rewritten copy lives only in the alternative pages.

## Log

- L0 (2026-11-22): "puedes cargar la skill de impeccable y hacer una anlisis de la interfaz, de posibles mejoras y ofrecerme ademas un diseño alternativo en otro endpoind para no estropear lo que ya tennemos? tiene que tener las mismas funcionalidades, eso si"
- L1 (2026-11-23): "es que no se que hiciste para saber que alternativas, quiero la mejorada asi como varias opciones para elegir una nueva"
- L2: The critique scored the site 16/32. It found one P0 (Contact clipped in the mobile nav), two P1s (section order, mouse-only visuals) and two P2s (overloaded hero, no visual hierarchy).
- L3: The client JS writes into fixed IDs, and `applyStaticTranslations` overwrites text by ID. `/v2` therefore keeps the IDs the JS needs and avoids the translated IDs wherever its copy differs.
- L4 (T1): `/v2/` and `/es/v2/` built. Main pages diff against the pre-change build: identical except the CSS bundle filename (same content hash). Screenshots at 1440 and 390 show no JS errors and no horizontal overflow at 390px (scrollWidth 390). Lint passes. Tests 5/6: `flow-tip` marker failing before and after this change.
- L5 (T2): Three previews built at `/v3/a/` (technical document), `/v3/b/` (metro map) and `/v3/c/` (strip-chart recorder), plus a comparison page at `/v3/`. They share `src/components/v3/previewContent.ts` and are written in Spanish. Captures at 1440 and 390 show no JS errors and no horizontal overflow. Route: inline, because parallel writers would share Astro's build cache and output directory, so their units were not independently verifiable.
- L6 (T2): Adding non-layout pages split the CSS and exposed a duplicated Tailwind copy on `/`: the integration injected base styles on top of the `@tailwind` directives already in `global.css`, taking the CSS from 21 KB to 38 KB. Fix: `tailwind({ applyBaseStyles: false })`, and v3 is excluded from the Tailwind content scan. Evidence: a `main` build in a scratch worktree compared with this branch shows the `/` and `/es/` HTML identical, the CSS byte-identical (same `BaseLayout.BKhNz53n.css`) and no new JS chunks.
- L7 (2026-11-23, owner feedback, verbatim): "pues no me gusta ninguna de las 3 opciones (la unica un poco original la del metro) ni la version mejorada, puedes hacerlo bastante mejor". Asked what is missing, the owner answered "tanto la 1 como la 2, le faltan ambas" (impact and interaction, plus a premium finish).
- L8 (T4): A new redesign at `/v4/` and `/es/v4/` builds on the metro idea:
  - a live network map with animated trains (paused off-screen, when the visitor pauses it, or under reduced motion) and keyboard-operable stations that feed a departure board, plus a vertical list on phones
  - a career line with expandable stops, a multi-select project filter with a count, and skill zones as ARIA tabs (logo, level and certifications)
  - a CV menu with the 3 PDFs, an EN/ES switch, and Schibsted Grotesk self-hosted in `assets/fonts/`
  - standalone, like `/v3/`: no Tailwind and no main-site JS.
  Evidence:
  - a browser probe confirmed the station click and Enter, pause, filter and clear, tab arrow keys, and Escape closing the CV menu, with no page errors
  - captures at 1440 and 390 show no overflow
  - `/` and `/es/` HTML and CSS are identical to the `main` build
- L9 (2026-11-23, owner feedback, verbatim): "esta versión esta mucho mejor, quizas cambiaria alguna cosa pero esta si ya esta mejor, aunque en las lineas de metro meteria una a la educiacion y otra a como diseño como ahora, y meteria otra como la linea laboral y despues que estne debajo como la experiencia laboral, pero esta si que tiene buena pinta, hazme dos más asi diferentes con estilo y las comprarmos, esta siguela mejorando tambien". T6: two more redesigns, `/v5/` (event stream) and `/v6/` (Swiss poster), built by parallel writers with disjoint edit surfaces.
- L10 (T5): `/v4/` now has three map lines: data method (red), work (blue, meets data at the current job) and education (green, crosses work at the first job). The section below holds work experience only, with education as a compact block. The project filter shows the 10 most frequent topics plus a toggle. The probe verifies the education and work stop boards, the topic toggle (11→32 chips) and all previous interactions; it reports no errors and no overflow at 390.

