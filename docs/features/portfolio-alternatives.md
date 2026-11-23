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
| T2  | S2, S4, S5 | inline | pending                       |          |
| T3  | S3         | inline | blocked on the owner's choice |          |

## Non-goals

- Changing the shared client JS (`src/js/`). Keyboard access for the D3 visuals and the 29-tag filter need it, so they are listed as open items for the owner to approve.
- Changing `resume.json` content. Rewritten copy lives only in the alternative pages.

## Log

- L0 (2026-11-22): "puedes cargar la skill de impeccable y hacer una anlisis de la interfaz, de posibles mejoras y ofrecerme ademas un diseño alternativo en otro endpoind para no estropear lo que ya tennemos? tiene que tener las mismas funcionalidades, eso si"
- L1 (2026-11-23): "es que no se que hiciste para saber que alternativas, quiero la mejorada asi como varias opciones para elegir una nueva"
- L2: The critique scored the site 16/32. It found one P0 (Contact clipped in the mobile nav), two P1s (section order, mouse-only visuals) and two P2s (overloaded hero, no visual hierarchy).
- L3: The client JS writes into fixed IDs, and `applyStaticTranslations` overwrites text by ID. `/v2` therefore keeps the IDs the JS needs and avoids the translated IDs wherever its copy differs.
- L4 (T1): `/v2/` and `/es/v2/` built. Main pages diff against the pre-change build: identical except the CSS bundle filename (same content hash). Screenshots at 1440 and 390 show no JS errors and no horizontal overflow at 390px (scrollWidth 390). Lint passes. Tests 5/6: `flow-tip` marker failing before and after this change.
