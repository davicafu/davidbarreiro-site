# Astro Pragmatic Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar el sitio actual a Astro por capas, manteniendo la misma UX visual/funcional en `/` y `/es/`, con `resume.json` y `resume.es.json` como fuente principal y sin reescribir D3 en esta fase.

**Architecture:** Astro pasa a renderizar shell, head, layout y copy estático; un adaptador fino lee los JSON raíz y serializa el payload para que los módulos existentes en `src/js/*` sigan montando `timeline`, `bubbles` y `flow` sobre los mismos contenedores. La migración mantiene IDs, clases, orden de secciones, rutas públicas y assets; cualquier refactor más profunda de contenido, i18n o D3 queda explícitamente para una fase 2.

**Tech Stack:** Astro, Tailwind CSS, ES modules, node:test, bundle D3 local, GitHub Pages, Vercel.

---

## Review Workload Forecast

| Field | Value |
| --- | --- |
| Estimated changed lines | 1100-1600 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 shell/public sync → PR 2 secciones/datos → PR 3 scripts/i18n/paridad |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## Trade-offs a validar antes de implementar

| Tema | Decisión pragmática | Motivo | Fase 2 abierta |
| --- | --- | --- | --- |
| Output Astro | Usar `outDir: "_site"` al principio | Evita chocar con el `dist/styles.css` legacy ya versionado | Normalizar output cuando legacy desaparezca |
| Assets públicos | Sincronizar raíz → `public/` con `scripts/sync-astro-public.mjs` | Conserva `/resume.json`, `/resume.es.json`, PDFs, favicon y assets sin mover la fuente principal | Reorganizar contenido si luego conviene |
| i18n | Render estático por ruta y runtime mínimo | Mantiene `/` + `/es/` sin meter i18n avanzada de Astro demasiado pronto | Evaluar i18n nativa de Astro |
| D3 | Adaptación mínima a bundling/islands | Preserva comportamiento actual y reduce riesgo visual | Reescritura gradual por visualización |

## File map before implementation

| Área | Archivos exactos |
| --- | --- |
| Shell Astro | `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`, `src/env.d.ts`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/es/index.astro`, `src/styles/global.css`, `tailwind.config.js`, `.gitignore` |
| Sync público | `scripts/sync-astro-public.mjs`, `public/` |
| Head y estáticos | `src/components/common/SeoHead.astro`, `src/components/common/ShellScripts.astro`, `src/components/sections/Hero.astro`, `Capabilities.astro`, `Portfolio.astro`, `Contact.astro`, `Footer.astro` |
| Datos | `src/data/resume.ts`, `src/lib/locale.ts`, `src/lib/translations.ts` |
| Cliente / D3 | `src/components/visuals/TimelineIsland.astro`, `BubblesIsland.astro`, `FlowIsland.astro`, `src/js/main.js`, `src/js/render.js`, `src/js/i18n.js`, `src/js/visuals-loader.js`, `src/js/timeline.js`, `src/js/bubbles.js`, `src/js/flow.js`, `src/js/state.js`, `src/js/ui.js`, `src/js/shell.js` |
| Verificación y retiro | `tests/astro-parity/routes-head.test.js`, `tests/astro-parity/dom-contract.test.js`, `tests/astro-parity/data-contract.test.js`, `.github/workflows/deploy-pages.yml`, `vercel.json`, `README.md`, `index.html`, `es/index.html`, `dist/styles.css` |

**Testing reality:** hoy ya existe `tests/d3-local-bundle.test.js`, pero no hay suite Astro. La verificación de la migración debe sumar `astro check`, `node --test`, build estático, checklist manual EN/ES y prueba funcional de `timeline`, `bubbles`, `flow`, hover/click/tap y `prefers-reduced-motion`.

### Task 1: Bootstrap Astro y shell base

**Files:**

- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/env.d.ts`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/es/index.astro`
- Create: `src/styles/global.css`
- Create: `scripts/sync-astro-public.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tailwind.config.js`
- Modify: `.gitignore`

- [ ] **Step 1: Instalar Astro y reservar un output que no rompa el legacy**  
       Run: `npm install -D astro @astrojs/check @astrojs/tailwind typescript`  
       Expected: `package.json` suma dependencias y scripts `dev`, `build`, `preview`, `check`; `astro.config.mjs` usa `outDir: "_site"` y el repo todavía puede convivir con `dist/styles.css`.

- [ ] **Step 2: Crear el shell base de Astro replicando la estructura actual**  
       Portar `<html>`, `<body>`, spotlight, wrappers, `header`, `main` y `footer` a `BaseLayout.astro` + `src/pages/index.astro` + `src/pages/es/index.astro`, manteniendo el mismo orden de secciones, IDs y clases críticas antes de extraer componentes.

- [ ] **Step 3: Sincronizar assets públicos sin mover la fuente principal**  
       Run: `npm run dev`  
       Expected: Astro levanta en `http://localhost:4321/`; `/`, `/es/`, `/resume.json`, `/resume.es.json`, `/cv-one-page.pdf`, `/favicon/favicon.ico` y `/assets/profile/profile-photo-112-112.avif` responden `200`.

### Task 2: Extraer layout y componentes estáticos

**Files:**

- Create: `src/components/common/SeoHead.astro`
- Create: `src/components/common/ShellScripts.astro`
- Create: `src/components/sections/Hero.astro`
- Create: `src/components/sections/Capabilities.astro`
- Create: `src/components/sections/Portfolio.astro`
- Create: `src/components/sections/Contact.astro`
- Create: `src/components/sections/Footer.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/es/index.astro`

- [ ] **Step 1: Extraer `head` y scripts shell repetidos**  
       Mover canonical, hreflang, Open Graph, Twitter, JSON-LD y el script de fade/PDF menu a `SeoHead.astro` y `ShellScripts.astro`, con props explícitas para `lang`, `title`, `description`, `canonical` y alternates EN/ES.

- [ ] **Step 2: Extraer las secciones 100% estáticas sin “mejorarlas”**  
       Portar `Hero`, `Capabilities`, `Portfolio`, `Contact` y `Footer` casi literal desde `index.html` / `es/index.html`, manteniendo clases Tailwind, jerarquía visual y los IDs que hoy usan `render.js` e `i18n.js`.

- [ ] **Step 3: Verificar composición y paridad estructural**  
       Run: `npm run dev`  
       Expected: `/` y `/es/` renderizan desde Astro con el mismo `header → hero → capabilities → experience → skills → flow → portfolio → contact → footer`, sin markup duplicado de `head` ni scripts inline repartidos entre ambas rutas.

### Task 3: Integrar `resume.json` y `resume.es.json` en Astro

**Files:**

- Create: `src/data/resume.ts`
- Create: `src/lib/locale.ts`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/es/index.astro`
- Modify: `src/components/sections/Hero.astro`
- Modify: `src/components/sections/Portfolio.astro`
- Modify: `src/components/sections/Contact.astro`

- [ ] **Step 1: Crear un adaptador fino para los JSON raíz**  
       `src/data/resume.ts` debe importar `../../resume.json` y `../../resume.es.json`, exponer `getResume(locale)` y helpers mínimos de lectura, sin cambiar shape ni mutar contenido.

- [ ] **Step 2: Pasar datos desde Astro al HTML y al runtime cliente**  
       Reemplazar copy hardcodeada por props basadas en `resume*.json` y serializar el payload en un `<script id="resume-data" type="application/json">` para que `src/js/main.js` deje de depender de `fetch('/resume*.json')`.

- [ ] **Step 3: Verificar fuente única y rutas públicas intactas**  
       Run: `npx astro check`  
       Expected: exit code `0`; `/` usa `resume.json`, `/es/` usa `resume.es.json`, y las copias públicas siguen sirviendo `200` sin duplicar lógica de datos.

### Task 4: Encapsular y adaptar scripts cliente / D3

**Files:**

- Create: `src/components/visuals/TimelineIsland.astro`
- Create: `src/components/visuals/BubblesIsland.astro`
- Create: `src/components/visuals/FlowIsland.astro`
- Create: `src/js/shell.js`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/es/index.astro`
- Modify: `src/js/main.js`
- Modify: `src/js/render.js`
- Modify: `src/js/i18n.js`
- Modify: `src/js/visuals-loader.js`
- Modify: `src/js/timeline.js`
- Modify: `src/js/bubbles.js`
- Modify: `src/js/flow.js`
- Modify: `src/js/state.js`
- Modify: `src/js/ui.js`

- [ ] **Step 1: Encapsular contenedores e hidratación sin tocar el comportamiento**  
       Crear `*Island.astro` que rendericen exactamente los mismos IDs (`timeline`, `bubbles`, `flow`, `timeline-tip`, `flow-tip`) y dejen a `main.js` montar la lógica actual sobre esos nodos.

- [ ] **Step 2: Adaptar el runtime a Astro/Vite con el menor cambio posible**  
       Cambiar imports absolutos `/src/js/...` por relativos, mover el fade/PDF menu a `src/js/shell.js`, leer `resume-data` y `data-locale` desde DOM, y mantener `scheduleVisualHydration`, `timeline`, `bubbles` y `flow` sin reescribir sus algoritmos.

- [ ] **Step 3: Verificar que la frontera cliente sigue viva**  
       Run: `npm run lint && node --test tests/d3-local-bundle.test.js`  
       Expected: ESLint termina con exit code `0` y los 2 tests existentes pasan; `/` y `/es/` no generan 404 para `/src/js/*`, no hacen fetch a `/resume*.json` para bootstrap y siguen montando las tres visualizaciones.

### Task 5: i18n pragmática con `/` y `/es/`

**Files:**

- Create: `src/lib/translations.ts`
- Modify: `src/lib/locale.ts`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/es/index.astro`
- Modify: `src/components/common/SeoHead.astro`
- Modify: `src/components/sections/Hero.astro`
- Modify: `src/components/sections/Capabilities.astro`
- Modify: `src/components/sections/Portfolio.astro`
- Modify: `src/components/sections/Contact.astro`
- Modify: `src/components/sections/Footer.astro`
- Modify: `src/js/i18n.js`
- Modify: `src/js/main.js`

- [ ] **Step 1: Mover al servidor toda la traducción estática**  
       `src/lib/translations.ts` debe concentrar labels, meta, CTA y copy no interactiva; las páginas Astro pasan `locale` y `messages` a cada sección para que el HTML salga correcto sin parche de texto en `load`.

- [ ] **Step 2: Dejar en cliente solo las traducciones interactivas**  
       Reducir `src/js/i18n.js` a tooltips, filtros, textos dinámicos de portfolio y ayudas de interacción; el locale debe salir de `<html lang>` o `data-locale`, no de heurísticas de pathname dispersas.

- [ ] **Step 3: Verificar rutas, SEO y copy por idioma**  
       Run: `npm run dev`  
       Expected: `http://localhost:4321/` mantiene canonical `/`, `http://localhost:4321/es/` mantiene canonical `/es/`, ambos exponen hreflang cruzado correcto y el HTML inicial ya sale traducido sin “flash” EN→ES.

### Task 6: Verificación de paridad y retiro controlado del legacy

**Files:**

- Create: `tests/astro-parity/routes-head.test.js`
- Create: `tests/astro-parity/dom-contract.test.js`
- Create: `tests/astro-parity/data-contract.test.js`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `vercel.json`
- Modify: `README.md`
- Delete: `index.html` *(solo tras aprobación de paridad)*
- Delete: `es/index.html` *(solo tras aprobación de paridad)*
- Delete: `dist/styles.css` *(solo si ya no lo consume ningún flujo legacy)*

- [ ] **Step 1: Agregar una suite de paridad específica para la migración**  
       Hacer que los tests lean `_site/index.html` y `_site/es/index.html` para validar canonical/hreflang, presencia y orden de secciones, IDs críticos, rutas de assets/PDFs y existencia de `resume-data`.

- [ ] **Step 2: Ejecutar la verificación automática y manual antes de borrar nada**  
       Run: `npm run build && node --test tests/d3-local-bundle.test.js tests/astro-parity/*.test.js`  
       Expected: `_site/index.html` y `_site/es/index.html` existen, todos los tests pasan y la checklist manual confirma paridad visual, D3, responsive, hover/click/tap y `prefers-reduced-motion`.

- [ ] **Step 3: Retirar el legacy de forma reversible**  
       Solo después de la aprobación, cambiar GitHub Pages/Vercel para servir `_site`, eliminar `index.html` y `es/index.html`, documentar rollback en `README.md`, y cerrar con: `npm run lint && npx astro check && npm run build`  
       Expected: exit code `0` en los tres comandos, deploy estático apuntando a Astro y ningún asset/ruta pública principal cambia respecto al sitio actual.

## Self-review

- **Spec coverage:** Task 1 cubre bootstrap Astro y shell; Task 2 cubre extracción de layout/componentes estáticos; Task 3 cubre integración de `resume.json` / `resume.es.json`; Task 4 cubre encapsulado y adaptación de cliente/D3; Task 5 cubre i18n `/` + `/es/`; Task 6 cubre paridad y retiro controlado del legacy.
- **Placeholder scan:** no quedaron `TODO`, `TBD`, “similar a”, ni rutas genéricas; cada tarea enumera archivos exactos, comandos concretos y resultado esperado.
- **Consistency check:** el plan usa de forma consistente la realidad actual del repo (`src/js/*`, no `src/scripts/*`), preserva `resume*.json` como fuente raíz y hace explícito el trade-off `dist/styles.css` legacy vs `outDir: "_site"` para Astro.
