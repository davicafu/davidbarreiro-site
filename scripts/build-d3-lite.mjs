import { build } from 'esbuild';

await build({
  entryPoints: ['src/js/vendor/d3-lite.entry.js'],
  outfile: 'src/js/vendor/d3-lite.js',
  bundle: true,
  format: 'esm',
  minify: true,
  platform: 'browser',
  target: 'es2020',
  legalComments: 'none'
});
