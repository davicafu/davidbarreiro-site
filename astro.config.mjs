import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // global.css already contains the @tailwind directives; the injected copy would only duplicate them.
  integrations: [tailwind({ applyBaseStyles: false })],
  outDir: '_site',
  // Dev used to live at /v9/ while it was a preview; keep old links working.
  redirects: {
    '/v9': '/',
    '/es/v9': '/es/'
  }
});
