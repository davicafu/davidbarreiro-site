const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8');
}

test('app no longer references the remote full D3 bundle', async () => {
  const [indexHtml, indexEsHtml, visualsLoader] = await Promise.all([
    readProjectFile('index.html'),
    readProjectFile('es/index.html'),
    readProjectFile('src/js/visuals-loader.js')
  ]);

  const remoteBundlePattern = /https:\/\/cdn\.jsdelivr\.net\/npm\/d3@7/i;

  assert.doesNotMatch(indexHtml, remoteBundlePattern);
  assert.doesNotMatch(indexEsHtml, remoteBundlePattern);
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
