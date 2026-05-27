# Interactive CV · Astro + Tailwind CSS + D3.js

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

```bash
pnpm install
pnpm run dev
```

Astro runs at `http://localhost:4321/`.

## Build

```bash
pnpm run build
```

The static output is generated in `_site/`.

## Deploy to GitHub Pages

Deployment is automated with GitHub Actions (`.github/workflows/deploy-pages.yml`).
On push to `main`, the workflow generates `cv-one-page.pdf`, builds Astro, and publishes `_site/`.

The repo uses pnpm 11.3.0 as the only package manager; if Vercel has `Install Command` or `Build Command` pinned to npm in the dashboard, update both to pnpm before the next deploy.

## Rollback

If parity issues appear in production:

1. Revert the migration commit(s) that removed legacy entrypoints.
2. Restore workflow artifact preparation to legacy mode (manual copy flow).
3. Redeploy from `main`.
