# CV animado · Tailwind CSS + D3.js

CV interactivo con:

- Reveal on scroll
- Hero con gradiente animado
- Spotlight que sigue el ratón
- Timeline D3 animado
- Bubble map de skills con zoom/pan y selección cruzada
- Soporte para `prefers-reduced-motion`

## Desarrollo local

Sirve el proyecto con un servidor local (para que `fetch("./resume.json")` funcione):

```bash
python -m http.server 5500
```

## Build de Tailwind (producción)

Este proyecto está preparado para compilar Tailwind y publicar en GitHub Pages sin usar `cdn.tailwindcss.com`.

1. Instala Node.js (incluye `npm`).
2. Instala dependencias:

```bash
npm install
```

3. Genera CSS:

```bash
npm run build:css
```

Esto crea `dist/styles.css` (el archivo que carga `index.html`).

## Publicar en GitHub Pages

Sube estos archivos al repositorio:

- `index.html`
- `resume.json`
- `dist/styles.css`

Activa GitHub Pages en `Settings > Pages` con la rama principal y carpeta raíz (`/`).
