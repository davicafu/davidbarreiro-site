import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // global.css already contains the @tailwind directives; the injected copy would only duplicate them.
  integrations: [tailwind({ applyBaseStyles: false })],
  outDir: '_site'
});
