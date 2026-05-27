# Design: migración pragmática a Astro

## Decisión

Migrar por capas hacia Astro, manteniendo la UX actual como contrato: mismo contenido base desde `resume.json` / `resume.es.json`, mismas rutas `/` y `/es/`, y misma experiencia D3 (`timeline`, `bubbles`, `flow`) encapsulada como cliente, no reescrita en esta fase.

## Goal

Mejorar DX, orden, estructura y mantenibilidad sin rediseño visual, sin cambiar la fuente principal de contenido y sin introducir una migración profunda antes de validar paridad.

## Quick path

1. Montar Astro como shell estático y replicar el HTML actual.
2. Extraer layout, head y secciones estáticas repetidas EN/ES.
3. Leer `resume*.json` desde Astro y pasar datos serializados a componentes.
4. Encapsular bootstrap y visualizaciones cliente sin cambiar su comportamiento.
5. Cerrar con i18n pragmática y verificación de paridad.

## Alcance / No-alcance

**Incluye:** shell Astro, componentes estáticos, carga de JSON, wrappers cliente, i18n pragmática, paridad visual/funcional.  
**No incluye:** rediseño, reescritura de D3, cambio de shape de `resume*.json`, SSR dinámico, CMS, ni una refactorización total del modelo JS imperativo.

## Arquitectura objetivo

| Capa | Decisión |
| --- | --- |
| Routing | `src/pages/index.astro` y `src/pages/es/index.astro`; sin i18n avanzada todavía. |
| Layout | `src/layouts/BaseLayout.astro` concentra head, meta, estilos globales y shell común. |
| UI estática | `src/components/sections/*.astro` reemplaza markup repetido sin alterar clases ni jerarquía visual. |
| Datos | `src/data/resume.ts` adapta `resume.json` y `resume.es.json` sin moverlos de su rol principal. |
| Cliente | `src/components/visuals/*Island.astro` monta contenedores con los mismos IDs; `src/scripts/*` conserva la lógica JS/D3 actual con adaptación mínima al bundling de Astro/Vite. |

`resume*.json` → `src/data/resume.ts` → páginas Astro/componentes estáticos → wrappers cliente → `main`/D3 sobre contenedores existentes.

## Mapa de archivos propuesto por fase

| Fase | Archivos principales |
| --- | --- |
| 1. Shell Astro | `package.json`, `astro.config.mjs`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/es/index.astro`, `src/styles/global.css` |
| 2. Extraer estáticos | `src/components/sections/Hero.astro`, `Capabilities.astro`, `Portfolio.astro`, `Contact.astro`, `src/components/common/SeoHead.astro` |
| 3. Integrar JSON | `src/data/resume.ts`, `src/lib/locale.ts`, conexión desde páginas Astro; `resume.json` y `resume.es.json` siguen en raíz |
| 4. Encapsular scripts cliente | `src/components/visuals/TimelineIsland.astro`, `BubblesIsland.astro`, `FlowIsland.astro`, `src/scripts/main.js`, `src/scripts/{render,state,utils,ui,visuals-loader,timeline,bubbles,flow}.js` |
| 5. i18n pragmática | `src/lib/translations.ts`, simplificación gradual de `src/scripts/i18n.js` para dejar en cliente solo lo interactivo |
| 6. Paridad y limpieza | `tests/astro-parity/*.test.js`, retiro de `index.html` y `es/index.html` solo después de aprobación |

## Riesgos y trade-offs por fase

| Fase | Riesgo / trade-off | Mitigación |
| --- | --- | --- |
| 1 | Astro cambia orden de carga respecto al HTML actual | Mantener IDs, clases y bootstrap diferido equivalente |
| 2 | Extraer componentes puede romper spacing o meta | Portar markup casi literal antes de “mejorarlo” |
| 3 | Cambiar `fetch` por import/adaptador puede desalinear datos | Usar adaptador fino; no mutar `resume*.json` |
| 4 | D3 hoy depende de DOM global y imports absolutos | Adaptar frontera de imports primero, no reescribir comportamiento |
| 5 | Astro i18n completa agregaría complejidad prematura | Mantener `/` + `/es/` y diccionarios mínimos |
| 6 | La limpieza final puede ocultar regresiones | Borrar legacy solo con checklist de paridad aprobado |

## Estrategia de migración incremental

Cada fase debe dejar el sitio deployable y reversible. Primero conviven Astro y assets legacy; después se mueve la fuente de render a Astro manteniendo las mismas rutas y contenedores. No se aprueba ningún trade-off visible sin revisión previa. La regla es simple: extraer primero, reemplazar después, limpiar al final.

## Estrategia de verificación

- Comparar `/` y `/es/` contra el sitio actual: head/meta, orden de secciones, copy, clases críticas y enlaces.
- Smoke tests sobre `resume.json` / `resume.es.json` como fuente única.
- Checklist manual de `timeline`, `bubbles`, `flow`, hover/click/tap, responsive y `prefers-reduced-motion`.
- Verificar que no cambien rutas públicas, PDFs, favicon, assets ni SEO principal.
- Aprobar fase por fase antes de eliminar archivos legacy.

## Criterios de aceptación

- [ ] UX visual y comportamiento D3 se mantienen.
- [ ] `resume.json` y `resume.es.json` siguen siendo la fuente principal.
- [ ] EN y ES quedan en Astro sin duplicación estructural innecesaria.
- [ ] Los scripts cliente quedan encapsulados y localizables.
- [ ] Cada fase tiene rollback razonable.
- [ ] No se elimina legacy hasta validar paridad completa.

## Cómo prepara una fase 2 más profunda

Deja separados layout, contenido, estáticos e interacción. Eso habilita una fase 2 con tipado más fuerte del contenido, migración gradual del render imperativo a componentes/islands más finos, adopción de i18n nativa de Astro si conviene, y una posible refactorización real de D3 sin mezclarla con la migración de plataforma.
