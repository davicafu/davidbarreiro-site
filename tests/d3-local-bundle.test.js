const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8');
}

test('app no longer references the remote full D3 bundle', async () => {
  const [shellScriptsComponent, pageEn, pageEs, visualsLoader] = await Promise.all([
    readProjectFile('src/components/common/ShellScripts.astro'),
    readProjectFile('src/pages/index.astro'),
    readProjectFile('src/pages/es/index.astro'),
    readProjectFile('src/js/visuals-loader.js')
  ]);

  const remoteBundlePattern = /https:\/\/cdn\.jsdelivr\.net\/npm\/d3@7/i;

  assert.doesNotMatch(shellScriptsComponent, remoteBundlePattern);
  assert.doesNotMatch(pageEn, remoteBundlePattern);
  assert.doesNotMatch(pageEs, remoteBundlePattern);
  assert.doesNotMatch(visualsLoader, remoteBundlePattern);
});

test('visual modules use the local D3 bundle', async () => {
  const [timeline, bubbles, flow, bundle] = await Promise.all([
    readProjectFile('src/js/timeline.js'),
    readProjectFile('src/js/bubbles.js'),
    readProjectFile('src/js/flow.js'),
    readProjectFile('src/js/vendor/d3-lite.js')
  ]);

  assert.match(timeline, /from '(\.\/vendor|\/src\/js\/vendor)\/d3-lite\.js'/);
  assert.match(bubbles, /from '(\.\/vendor|\/src\/js\/vendor)\/d3-lite\.js'/);
  assert.match(flow, /from '(\.\/vendor|\/src\/js\/vendor)\/d3-lite\.js'/);
  assert.ok(bundle.length > 0);
});

test('astro runtime bootstraps from DOM locale and embedded resume data', async () => {
  const [mainScript, baseLayout] = await Promise.all([
    readProjectFile('src/js/main.js'),
    readProjectFile('src/layouts/BaseLayout.astro')
  ]);

  assert.match(baseLayout, /id="resume-data"/);
  assert.match(baseLayout, /data-locale=\{lang\}/);
  assert.match(mainScript, /document\.getElementById\('resume-data'\)/);
  assert.doesNotMatch(mainScript, /fetch\('\/resume(?:\.es)?\.json'\)|fetch\("\/resume(?:\.es)?\.json"\)/);
  assert.doesNotMatch(mainScript, /window\.location\.pathname/);
});
