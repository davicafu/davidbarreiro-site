import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // global.css already contains the @tailwind directives; the injected copy would only duplicate them.
  integrations: [tailwind({ applyBaseStyles: false })],
  outDir: '_site',
  // Preview routes from before the themes had names; keep old links working.
  redirects: {
    '/v6': '/editorial/',
    '/es/v6': '/es/editorial/',
    '/v7': '/live/',
    '/es/v7': '/es/live/',
    '/v9': '/',
    '/es/v9': '/es/'
  }
});
