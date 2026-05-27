# Design: migración pragmática de npm a pnpm

## Decisión

Adoptar pnpm 11.x como único package manager del repo. La migración fija `packageManager` en `package.json`, reemplaza `package-lock.json` por `pnpm-lock.yaml`, agrega `pnpm-workspace.yaml` aunque hoy haya un solo package, y explicita una política base en repo: `minimumReleaseAge: 1440`, `minimumReleaseAgeStrict: false`, `blockExoticSubdeps: true`. CI, README y notas de deploy pasan a pnpm. No se cambia UX, rutas ni output del sitio.

## Goal

Mejorar supply-chain hardening, DX y disciplina operativa con el menor cambio necesario en un repo single-package que hoy usa npm en scripts y CI.

## Quick path

1. Fijar pnpm y sus archivos fuente de verdad: `packageManager`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`.
2. Normalizar scripts y docs para que el repo deje de depender implícitamente de `npm run`.
3. Migrar CI y docs de deploy a pnpm; recién después retirar `package-lock.json`.

## Alcance / No-alcance

**Incluye:** package manager, lockfile, políticas pnpm, scripts root, README, GitHub Actions y documentación operativa.  
**No incluye:** upgrades de dependencias, cambios UX, cambios de hosting, monorepo, ni endurecimiento extra como `minimumReleaseAgeStrict: true`, `trustPolicy` o `nodeLinker` custom en la fase inicial.

## Arquitectura / config objetivo

| Pieza | Rol |
| --- | --- |
| `package.json` | Agrega `packageManager` con versión exacta de pnpm y deja scripts sin shell-outs a npm. |
| `pnpm-lock.yaml` | Pasa a ser la única fuente de verdad de resolución; se comitea y gobierna CI con lockfile congelado. |
| `pnpm-workspace.yaml` | Centraliza config de pnpm 11; aunque sea single-package, sirve para declarar política y deja incluida la raíz aun sin `packages`. |
| `minimumReleaseAge` | Retrasa instalaciones de versiones demasiado nuevas para reducir riesgo de supply-chain. |
| `minimumReleaseAgeStrict` | Queda en `false` para no bloquear la migración si todavía no existe una versión “madura” dentro del rango pedido. |
| `blockExoticSubdeps` | Queda explícito en `true` para impedir subdependencias transitivas desde git/tarballs no esperados. |
| CI / deploy docs | `.github/workflows/deploy-pages.yml` y `README.md` pasan a usar pnpm y documentan el contrato operativo. |

## Fases de migración

| Fase | Resultado |
| --- | --- |
| 1. Pin y config | Definir versión pnpm, crear `pnpm-workspace.yaml`, generar `pnpm-lock.yaml`. |
| 2. Scripts locales | Reemplazar referencias `npm run` embebidas en `predev` y `build`, y actualizar ejemplos del README. |
| 3. CI y deploy | Cambiar cache/install/build en `.github/workflows/deploy-pages.yml`; revisar docs de deploy para GitHub Pages/Vercel. |
| 4. Limpieza | Eliminar `package-lock.json` y dejar pnpm como contrato único del repo. |

## Archivos a tocar

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `package.json` | Modificar | Pin `packageManager` y normalizar scripts que hoy invocan `npm run`. |
| `pnpm-lock.yaml` | Crear | Lockfile oficial de la migración. |
| `pnpm-workspace.yaml` | Crear | Fuente de settings y política explícita de pnpm 11. |
| `package-lock.json` | Eliminar | Sale en la fase final para evitar doble fuente de verdad. |
| `README.md` | Modificar | Actualizar install/dev/build/rollback y notas para contributors. |
| `.github/workflows/deploy-pages.yml` | Modificar | Migrar cache/install/build a pnpm. |
| `docs/superpowers/specs/2026-05-25-pnpm-pragmatic-migration-design.md` | Crear | Diseño de referencia. |

Fuera del repo: revisar settings de Vercel si tienen install/build command fijado a npm.

## Riesgos y trade-offs

| Riesgo | Trade-off | Mitigación |
| --- | --- | --- |
| Scripts aún acoplados a npm | Migración “a medias” | Cambiar shell-outs internos, no solo ejemplos del README. |
| `minimumReleaseAge` frena fixes recién publicados | Más seguridad vs menos inmediatez | Arrancar con 1440 min y `minimumReleaseAgeStrict: false`. |
| CI hoy usa cache/install npm | El cambio toca pipeline, no solo dev local | Migrar workflow junto con el lockfile, no después. |
| Deploy externo puede seguir apuntando a npm | Drift fuera del repo | Documentar chequeo de Vercel/GitHub Pages en fase 3. |
| Versiones distintas de pnpm entre contribuidores | DX inconsistente | `packageManager` como contrato único y validación en CI. |

## Estrategia de verificación

- Instalación limpia con `pnpm install` y en CI con lockfile congelado.
- `pnpm run build`, `pnpm run check` y `pnpm run lint` deben seguir verdes.
- Confirmar que `pnpm-lock.yaml` cambia solo cuando cambian dependencias.
- Validar que GitHub Pages construye/publica igual que antes.
- Revisar README y docs de deploy para que no quede ninguna instrucción principal con npm.

## Criterios de aceptación

- [ ] El repo declara pnpm de forma explícita con `packageManager`.
- [ ] `pnpm-lock.yaml` reemplaza a `package-lock.json` como lockfile oficial.
- [ ] `pnpm-workspace.yaml` existe y contiene la política explícita del repo.
- [ ] `minimumReleaseAge`, `minimumReleaseAgeStrict` y `blockExoticSubdeps` quedan documentados y versionados.
- [ ] Scripts root, README y GitHub Actions usan pnpm de punta a punta.
- [ ] Las notas de CI/deploy dejan claro cualquier chequeo externo al repo, como Vercel.
