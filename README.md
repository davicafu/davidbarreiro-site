# Interactive CV · Tailwind CSS + D3.js

Interactive CV website with:

- Scroll reveal animations
- Animated gradient hero
- Mouse spotlight effect
- D3 timeline (work + education)
- D3 skill bubbles map with zoom/pan and filtering
- System design interactive flow
- `prefers-reduced-motion` support

## Live Deployment

GitHub Pages: https://davicafu.github.io/davidbarreiro-site/
Vercel: https://davidbarreiro.vercel.app/

## Run Locally

Serve the project from the repo root:

```bash
npx serve .
```

## Tailwind Build

1. Install dependencies:

```bash
npm install
```

2. Build CSS:

```bash
npm run build:css
```

This generates `dist/styles.css`, which is loaded by `index.html`.

## Deploy to GitHub Pages

Deployment is automated with GitHub Actions (`.github/workflows/deploy-pages.yml`).
On push to `main`, the workflow builds Tailwind CSS and publishes:

- `index.html`
- `resume.json`
- `dist/`
- `favicon/`
- `assets/`
- `src/`
