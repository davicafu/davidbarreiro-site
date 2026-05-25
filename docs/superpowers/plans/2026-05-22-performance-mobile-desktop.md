# Performance Mobile + Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mejorar Lighthouse mobile y desktop sin rediseñar la UI, haciendo que hero/H1 rendericen de inmediato y difiriendo toda la hidratación D3 fuera del critical path.

**Architecture:** Mantener `index.html` y `es/index.html` como entrypoints con contenido above-the-fold final, arrancar `main.js` sin esperar D3, y mover la carga/hidratación visual a un loader diferido con `requestIdleCallback` + `IntersectionObserver`. Reducir reflows en `timeline.js`, montar `bubbles.js`/`flow.js` solo al acercarse al viewport, y pasar avatar/D3 a same-origin para bajar dependencia crítica externa.

**Tech Stack:** HTML estático, ES modules, D3 v7, Tailwind CSS ya compilado, JSON resume data, Python `http.server`, Lighthouse CLI, Chrome DevTools.

---

## Review Workload Forecast

| Field                   | Value                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| Estimated changed lines | 700-1100                                                                    |
| 400-line budget risk    | High                                                                        |
| Chained PRs recommended | Yes                                                                         |
| Suggested split         | PR 1 hero/bootstrap/assets → PR 2 timeline → PR 3 bubbles/flow/verification |
| Delivery strategy       | ask-on-risk                                                                 |
| Chain strategy          | pending                                                                     |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## File map before implementation

| File                                                               | Role in this change                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `index.html:391-650`                                               | Hero EN, capabilities cards, inline boot script, current blocking D3 loader            |
| `es/index.html:391-650`                                            | Hero ES entrypoint with the same blocking D3 pattern                                   |
| `src/js/main.js:1-72`                                              | Current monolithic bootstrap + resize rerender of all visuals                          |
| `src/js/render.js:51-102,104-125,236-249`                          | Hero/avatar rendering and D3-dependent counters                                        |
| `src/js/timeline.js:1-800`                                         | Largest hot path; today mixes duplicated mobile logic and multiple layout reads/writes |
| `src/js/bubbles.js:6-344`                                          | D3 bubbles mount + interactions; currently always runs on initial load                 |
| `src/js/flow.js:3-519`                                             | D3 flow mount + interactions; currently always runs on initial load                    |
| `resume.json:5` + `resume.es.json:9`                               | External avatar URL that should become same-origin                                     |
| `assets/vendor/d3.v7.min.js`                                       | New vendored D3 entry, same-origin first                                               |
| `assets/profile/avatar-112.avif`, `assets/profile/avatar-224.avif` | New local avatar assets for 1x/2x hero usage                                           |

**Testing reality:** no `**/*test*` or `**/*spec*` JS tests exist today, so verification has to rely on `npm run lint`, `npm run format:check`, local serving, Lighthouse, DevTools traces, and manual EN/ES checks.

### Task 1: Baseline and direct-repo safety

**Files:**

- Modify: `docs/superpowers/plans/lighthouse-en-mobile-before.json`
- Modify: `docs/superpowers/plans/lighthouse-en-desktop-before.json`
- Modify: `docs/superpowers/plans/lighthouse-es-mobile-before.json`
- Modify: `docs/superpowers/plans/lighthouse-es-desktop-before.json`

- [ ] **Step 1: Confirm the repo is safe to edit without worktree**  
       Run: `git status --short`  
       Expected: árbol limpio o solamente cambios que el implementador reconoce antes de tocar `index.html`, `es/index.html`, `src/js/*.js`, `resume*.json`, o `assets/`.

- [ ] **Step 2: Levantar el sitio local desde la raíz**  
       Run: `python3 -m http.server 4173`  
       Expected: `Serving HTTP on 0.0.0.0 port 4173` y el sitio responde en `http://127.0.0.1:4173/` y `http://127.0.0.1:4173/es/`.

- [ ] **Step 3: Capturar línea base de performance antes de editar**  
       Run: `npx lighthouse "http://127.0.0.1:4173/" --only-categories=performance --output=json --output-path="./docs/superpowers/plans/lighthouse-en-mobile-before.json" --chrome-flags="--headless=new" --form-factor=mobile --screenEmulation.mobile=true`  
       Run: `npx lighthouse "http://127.0.0.1:4173/" --preset=desktop --only-categories=performance --output=json --output-path="./docs/superpowers/plans/lighthouse-en-desktop-before.json" --chrome-flags="--headless=new"`  
       Run: `npx lighthouse "http://127.0.0.1:4173/es/" --only-categories=performance --output=json --output-path="./docs/superpowers/plans/lighthouse-es-mobile-before.json" --chrome-flags="--headless=new" --form-factor=mobile --screenEmulation.mobile=true`  
       Run: `npx lighthouse "http://127.0.0.1:4173/es/" --preset=desktop --only-categories=performance --output=json --output-path="./docs/superpowers/plans/lighthouse-es-desktop-before.json" --chrome-flags="--headless=new"`  
       Expected: cada comando termina con reporte guardado; repetir 3 veces por URL/modo y quedarse con la mediana.

### Task 2: Hero/LCP inmediato + headings semánticos

**Files:**

- Modify: `index.html:391-650`
- Modify: `es/index.html:391-650`

- [ ] **Step 1: Dejar el hero final en HTML y no en espera de JS**  
       Editar ambos entrypoints para que `#hero-kicker`, `#hero-name`, `#hero-surname`, `#hero-summary`, CTAs, avatar y logo ya contengan el contenido final correcto al parsear HTML.  
       Expected: con JS lento o bloqueado, el usuario igual ve H1, summary, CTA y tarjeta lateral above-the-fold.

- [ ] **Step 2: Corregir la jerarquía de headings de capabilities**  
       Insertar un `h2` visible para la sección de capacidades antes de los tres cards y bajar los títulos de card para que queden subordinados semánticamente al nuevo heading.  
       Expected: el outline queda `h1` hero → `h2` capabilities/experience/skills/system design/portfolio/contact → títulos internos subordinados, sin saltos inválidos.

- [ ] **Step 3: Fijar dimensiones explícitas y prioridad de imágenes above-the-fold**  
       Agregar `width`/`height` reales al avatar y al logo, usar asset same-origin para el logo, y definir `fetchpriority="high"` solo en la imagen hero que participa del LCP.  
       Expected: CLS estable y Lighthouse deja de marcar imágenes sin dimensiones en el hero.

### Task 3: Split bootstrap core vs visual hydration + loader diferido de D3

**Files:**

- Modify: `src/js/main.js:1-72`
- Create: `src/js/visuals-loader.js`
- Create: `assets/vendor/d3.v7.min.js`
- Modify: `index.html:572-650`
- Modify: `es/index.html:572-650`

- [ ] **Step 1: Crear un loader central para D3 e hidratación visual**  
       Implementar `src/js/visuals-loader.js` con `ensureD3()`, fallback entre `requestIdleCallback` y `setTimeout`, `IntersectionObserver` con `rootMargin` generoso, y carga same-origin-first desde `assets/vendor/d3.v7.min.js` con fallback diferido al CDN actual solo si falla.  
       Expected: una sola ruta de carga de D3 y cero duplicación del script-loader inline entre EN y ES.

- [ ] **Step 2: Partir `main.js` entre core inmediato y visuales diferidos**  
       Refactorizar a `bootstrapCore()` para locale/fetch/render hero+metrics+portfolio+legend y `scheduleVisualHydration()` para timeline/bubbles/flow después de `load` + idle.  
       Expected: `main.js` puede ejecutarse aunque D3 todavía no exista y el fetch de `resume(.es).json` deja de depender de la red del CDN.

- [ ] **Step 3: Limpiar ambos HTML para cargar solo el core module**  
       Sacar la secuencia inline `d3Script.onload → appScript` y reemplazarla por carga directa del módulo principal, dejando los mensajes de visual unavailable en manos del nuevo loader.  
       Expected: si D3 está bloqueado, siguen apareciendo hero/H1/summary/metrics/portfolio y solo fallan las visualizaciones con estado controlado.

### Task 4: Render core sin D3 + avatar same-origin

**Files:**

- Modify: `src/js/render.js:51-102,104-125,236-249`
- Modify: `resume.json:5`
- Modify: `resume.es.json:9`
- Create: `assets/profile/avatar-112.avif`
- Create: `assets/profile/avatar-224.avif`

- [ ] **Step 1: Sacar D3 del path de counters**  
       Cambiar `counters()` para que pinte el valor final inmediatamente con DOM nativo, o con una mejora opcional que no dependa de `window.d3` para el first render.  
       Expected: `render.js` deja de referenciar `d3.select(...).transition()` en métricas críticas.

- [ ] **Step 2: Reordenar el fallback de avatar**  
       Hacer que `renderHeader()` prefiera `basics.image` local, luego GitHub avatar, y por último `favicon/favicon.ico`, conservando `alt` y clases de degradación.  
       Expected: la primera request del avatar ya no sale a `i.postimg.cc`.

- [ ] **Step 3: Actualizar ambos resumes para usar assets locales**  
       Reemplazar la URL externa en `resume.json` y `resume.es.json` por el avatar optimizado same-origin que usa el hero.  
       Expected: EN y ES consumen el mismo asset local y comparten caché del navegador.

### Task 5: Cleanup de `timeline.js` y reflows móviles

**Files:**

- Modify: `src/js/timeline.js:1-800`

- [ ] **Step 1: Eliminar la rama mobile muerta/duplicada**  
       Consolidar la lógica mobile en un solo camino; hoy conviven una rama DOM temprana (`lines 48-305`) y otra rama mobile posterior (`lines 483-781`), y el plan es quedarse con una sola implementación mantenible.  
       Expected: un solo flujo mobile, un solo cleanup y cero código inalcanzable o redundante.

- [ ] **Step 2: Separar lecturas y escrituras de layout**  
       Agrupar mediciones (`getBoundingClientRect`, `scrollHeight`, `offsetWidth/Height`) antes de aplicar `style`, `transform`, `viewBox` o `transition`, usando una sola frame stage cuando haga falta.  
       Expected: el trace de expand/collapse deja de mostrar forced layout recurrente; como máximo queda una lectura intencional para la animación sweep.

- [ ] **Step 3: Mantener idempotencia de rerender y cleanup**  
       Preservar la limpieza de timers, RAFs y listeners en `el.__timelineCleanup`, y asegurar que resize o re-entry no acumulen overlays ni listeners huérfanos.  
       Expected: varios resizes/abrir-cerrar cards no duplican handlers ni empeoran el costo de interacción.

### Task 6: Lazy init de bubbles y flow

**Files:**

- Modify: `src/js/bubbles.js:6-344`
- Modify: `src/js/flow.js:3-519`
- Modify: `src/js/main.js:1-72`
- Modify: `src/js/visuals-loader.js`

- [ ] **Step 1: Hacer mount diferido e idempotente para ambas visuales**  
       Exponer inicialización perezosa y `refresh()` seguro para `bubbles` y `flow`, montando SVG solo cuando el contenedor entra cerca del viewport.  
       Expected: al primer paint no existen `#bubbles svg` ni `#flow svg` si el usuario no llegó a esas secciones.

- [ ] **Step 2: Cortar resize work para visuales no montadas**  
       Mover el debounce de resize a `main.js` y llamar refrescos únicamente de módulos ya hidratados.  
       Expected: hacer resize en el hero no dispara D3 work para secciones todavía offscreen.

- [ ] **Step 3: Validar que interacciones sigan vivas después del mount tardío**  
       Revisar filtros del legend, keyword chips, zoom/pan de bubbles y hover/click detail de flow después de hidratar por observer.  
       Expected: el diferido no rompe UX ni pierde estado básico de selección/focus.

### Task 7: Verificación honesta final

**Files:**

- Modify: `docs/superpowers/plans/lighthouse-en-mobile-after.json`
- Modify: `docs/superpowers/plans/lighthouse-en-desktop-after.json`
- Modify: `docs/superpowers/plans/lighthouse-es-mobile-after.json`
- Modify: `docs/superpowers/plans/lighthouse-es-desktop-after.json`

- [ ] **Step 1: Ejecutar validaciones automáticas disponibles**  
       Run: `npm run lint`  
       Expected: exit code `0` y sin errores de ESLint.  
       Run: `npm run format:check`  
       Expected: `All matched files use Prettier code style!`

- [ ] **Step 2: Repetir Lighthouse mobile + desktop después del cambio**  
       Run: `npx lighthouse "http://127.0.0.1:4173/" --only-categories=performance --output=json --output-path="./docs/superpowers/plans/lighthouse-en-mobile-after.json" --chrome-flags="--headless=new" --form-factor=mobile --screenEmulation.mobile=true`  
       Run: `npx lighthouse "http://127.0.0.1:4173/" --preset=desktop --only-categories=performance --output=json --output-path="./docs/superpowers/plans/lighthouse-en-desktop-after.json" --chrome-flags="--headless=new"`  
       Run: `npx lighthouse "http://127.0.0.1:4173/es/" --only-categories=performance --output=json --output-path="./docs/superpowers/plans/lighthouse-es-mobile-after.json" --chrome-flags="--headless=new" --form-factor=mobile --screenEmulation.mobile=true`  
       Run: `npx lighthouse "http://127.0.0.1:4173/es/" --preset=desktop --only-categories=performance --output=json --output-path="./docs/superpowers/plans/lighthouse-es-desktop-after.json" --chrome-flags="--headless=new"`  
       Expected: reportes guardados y mejora medible en LCP/TBT/INP sin subir CLS.

- [ ] **Step 3: Hacer chequeos manuales que hoy reemplazan tests inexistentes**  
       En Chrome DevTools, bloquear `assets/vendor/d3.v7.min.js` y recargar `/` y `/es/`; luego grabar un Performance trace mobile al abrir/cerrar cards de timeline y revisar headings/imágenes en ambos idiomas.  
       Expected: hero/H1/summary/CTA/metrics siguen visibles sin D3, las visuales se degradan con gracia, no aparecen warnings repetidos de forced layout, no hay CLS nuevo y las animaciones siguen funcionando después de hidratar.

## Self-review

- **Spec coverage:** cubierto hero/LCP inmediato (Task 2), split bootstrap + deferred D3 (Task 3), cleanup timeline/mobile branch (Task 5), lazy bubbles/flow (Task 6), imágenes/avatar (Task 4), headings semánticos (Task 2), Lighthouse mobile+desktop (Tasks 1 y 7).
- **Placeholder scan:** no quedaron `TODO`, `TBD`, “similar a”, ni comandos implícitos; todas las rutas y comandos están explicitados.
- **Consistency check:** el plan usa de forma consistente `src/js/visuals-loader.js`, `assets/vendor/d3.v7.min.js`, `assets/profile/avatar-112.avif`, `assets/profile/avatar-224.avif` y la carpeta `docs/superpowers/plans/` para artefactos de verificación.
