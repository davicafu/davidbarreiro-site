# PNPM Pragmatic Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar este repo de npm a pnpm 11.3.0 sin cambiar UX ni output, dejando un contrato operativo explícito para desarrollo local, CI y deploy.

**Architecture:** El cambio mantiene el repo como single-package, pero agrega `pnpm-workspace.yaml` como fuente central de configuración para pnpm 11 y fija `packageManager` en `package.json` para cerrar la versión del package manager. La migración se hace en cuatro cortes: pin/config base, scripts + lockfile, CI/docs, y recién al final retiro de `package-lock.json`, porque el lockfile y la política de supply-chain son parte del contrato, no un detalle incidental.

**Tech Stack:** Node 22, Corepack, pnpm 11.3.0, Astro, GitHub Actions, GitHub Pages, Vercel.

---

## Review Workload Forecast

| Field | Value |
| --- | --- |
| Estimated changed lines | 10,200-13,500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 pin/config → PR 2 scripts/lockfile → PR 3 CI/docs → PR 4 cleanup/final verification |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## File map before implementation

| File | Role in this change |
| --- | --- |
| `package.json` | Fija `packageManager` y elimina shell-outs internos a `npm run`. |
| `pnpm-workspace.yaml` | Declara la política explícita del repo (`minimumReleaseAge`, `minimumReleaseAgeStrict`, `blockExoticSubdeps`). |
| `pnpm-lock.yaml` | Pasa a ser el lockfile oficial del repo. |
| `package-lock.json` | Se mantiene temporalmente hasta el corte final y luego se elimina. |
| `.github/workflows/deploy-pages.yml` | Cambia cache/install/build para pnpm con lockfile congelado. |
| `README.md` | Cambia install/dev/build y documenta el contrato operativo + chequeo externo de Vercel. |
| `vercel.json` | Solo revisión: no define install/build commands, así que el drift de Vercel vive fuera del repo. |

**Testing reality:** este cambio no suma tests de aplicación; la verificación real es operativa: `pnpm install`, `pnpm run build`, `pnpm run check`, `pnpm run lint`, y revisión de que CI + docs ya no dependan de npm en archivos vivos del repo.

### Task 1: Pin y config base de pnpm

**Files:**

- Modify: `package.json`
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1: Confirmar el estado inicial del repo antes de tocar contrato de package manager**  
       Run: `git status --short`  
       Expected: ves el árbol real a intervenir antes del cambio; NO se asume repo limpio porque ya hay trabajo de Astro en curso.

- [ ] **Step 2: Fijar pnpm 11.3.0 como contrato explícito en `package.json`**  
       Editar el bloque raíz para que incluya exactamente:  
       ```json
       {
         "name": "davicafu-tailwind-d3-animated",
         "private": true,
         "version": "1.0.0",
         "packageManager": "pnpm@11.3.0"
       }
       ```  
       Expected: `node -p "require('./package.json').packageManager"` imprime `pnpm@11.3.0`.

- [ ] **Step 3: Crear `pnpm-workspace.yaml` con la política explícita aprobada**  
       Crear el archivo con este contenido exacto, sin `packages:` porque pnpm 11 incluye la raíz si el campo se omite:  
       ```yaml
       minimumReleaseAge: 1440
       minimumReleaseAgeStrict: false
       blockExoticSubdeps: true
       ```  
       Run: `python3 - <<'PY'
from pathlib import Path
print(Path('pnpm-workspace.yaml').read_text())
PY`  
       Expected: el archivo existe y muestra exactamente las tres claves aprobadas.

### Task 2: Scripts locales y lockfile

**Files:**

- Modify: `package.json`
- Create: `pnpm-lock.yaml`

- [ ] **Step 1: Reemplazar shell-outs internos a npm en scripts root**  
       Cambiar solo estas dos líneas de `package.json`:  
       ```json
       "predev": "pnpm run sync:astro-public",
       "build": "pnpm run sync:astro-public && astro build"
       ```  
       Expected: `node -p "const s=require('./package.json').scripts; [s.predev,s.build].join('\n')"` imprime ambas líneas con `pnpm run` y sin `npm run`.

- [ ] **Step 2: Generar el lockfile oficial de pnpm sin retirar todavía `package-lock.json`**  
       Run: `corepack pnpm install`  
       Expected: aparece `pnpm-lock.yaml`, `node_modules` queda administrado por pnpm y `package-lock.json` sigue presente temporalmente para permitir el corte final controlado.

- [ ] **Step 3: Verificar que los scripts locales clave siguen verdes con pnpm**  
       Run: `corepack pnpm run check && corepack pnpm run lint && corepack pnpm run build`  
       Expected: los tres comandos terminan con exit code `0` y Astro sigue generando `_site/` sin cambiar rutas ni comportamiento esperado del sitio.

### Task 3: CI, deploy y documentación operativa

**Files:**

- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`
- Review only: `vercel.json`

- [ ] **Step 1: Migrar GitHub Actions a pnpm con Corepack y lockfile congelado**  
       Reemplazar la parte de Node/install/build en `.github/workflows/deploy-pages.yml` por este shape exacto:  
       ```yaml
       - name: Setup Node
         uses: actions/setup-node@v5
         with:
           node-version: 22
           cache: pnpm

       - name: Enable Corepack
         run: corepack enable

       - name: Install deps
         run: pnpm install --frozen-lockfile

       - name: Build Astro site
         run: pnpm run build
       ```  
       Expected: el workflow deja de usar `cache: npm`, `npm ci` y `npm run build`; la instalación queda atada al `packageManager` + `pnpm-lock.yaml`.

- [ ] **Step 2: Actualizar el README al contrato operativo nuevo**  
       Reemplazar los bloques principales para que digan exactamente:  
       ```bash
       pnpm install
       pnpm run dev
       ```  
       y  
       ```bash
       pnpm run build
       ```  
       Agregar una nota explícita bajo deploy/rollback: “El repo usa pnpm 11.3.0 como único package manager; si Vercel tiene `Install Command` o `Build Command` fijados a npm en el dashboard, actualizarlos a pnpm antes del siguiente deploy.”  
       Expected: README cubre local dev, build, rollback y chequeo externo de Vercel sin instrucciones principales con npm.

- [ ] **Step 3: Verificar que los archivos operativos vivos ya no dependan de npm**  
       Run: `rg -n "npm (install|ci|run)" README.md package.json .github/workflows/deploy-pages.yml`  
       Expected: no output.

### Task 4: Verificación final y retiro de `package-lock.json`

**Files:**

- Delete: `package-lock.json`
- Verify: `pnpm-lock.yaml`
- Verify: `package.json`
- Verify: `.github/workflows/deploy-pages.yml`
- Verify: `README.md`

- [ ] **Step 1: Ejecutar la validación final completa con el lockfile de pnpm**  
       Run: `corepack pnpm install --frozen-lockfile && corepack pnpm run check && corepack pnpm run lint && corepack pnpm run build`  
       Expected: install headless con `pnpm-lock.yaml`, exit code `0` en los cuatro comandos y `_site/` generado igual que antes.

- [ ] **Step 2: Retirar la doble fuente de verdad solo después de tener todo verde**  
       Delete: `package-lock.json`  
       Run: `test ! -f package-lock.json && test -f pnpm-lock.yaml`  
       Expected: exit code `0`; el repo queda con un único lockfile versionado: `pnpm-lock.yaml`.

- [ ] **Step 3: Hacer el barrido final de disciplina operativa**  
       Run: `rg -n "npm (install|ci|run)" README.md package.json .github/workflows/deploy-pages.yml && exit 1 || true`  
       Expected: no matches en archivos operativos vivos; las únicas referencias residuales a npm pueden quedar en artefactos históricos dentro de `docs/superpowers/`.

## Self-review

- **Spec coverage:** Task 1 cubre pin/config base (`packageManager`, `pnpm-workspace.yaml`, política explícita); Task 2 cubre scripts locales y `pnpm-lock.yaml`; Task 3 cubre CI/deploy/docs; Task 4 cubre verificación final y retiro de `package-lock.json`.
- **Placeholder scan:** no quedaron marcadores pendientes, promesas vagas ni comandos genéricos; todos los archivos, snippets y comandos están explicitados.
- **Consistency check:** el plan usa de forma consistente `pnpm@11.3.0`, `pnpm-workspace.yaml` sin `packages:` para root-only workspace, `pnpm install --frozen-lockfile` en CI/final validation y `minimumReleaseAgeStrict: false` explícito para no heredar el default estricto cuando `minimumReleaseAge` se configura manualmente.
