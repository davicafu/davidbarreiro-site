const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

async function readBuiltPage(relativePath) {
  return readFile(path.join(projectRoot, '_site', relativePath), 'utf8');
}

test('built routes expose expected lang/canonical/hreflang contracts', async () => {
  const [enHtml, esHtml] = await Promise.all([readBuiltPage('index.html'), readBuiltPage('es/index.html')]);

  assert.match(enHtml, /<html[^>]*lang="en"/i);
  assert.match(esHtml, /<html[^>]*lang="es"/i);

  assert.match(enHtml, /<link rel="canonical" href="https:\/\/davidbarreiro\.dev\/"\s*>/i);
  assert.match(esHtml, /<link rel="canonical" href="https:\/\/davidbarreiro\.dev\/es\/"\s*>/i);

  for (const html of [enHtml, esHtml]) {
    assert.match(html, /<link rel="alternate" hreflang="en" href="https:\/\/davidbarreiro\.dev\/"\s*>/i);
    assert.match(html, /<link rel="alternate" hreflang="es" href="https:\/\/davidbarreiro\.dev\/es\/"\s*>/i);
    assert.match(
      html,
      /<link rel="alternate" hreflang="x-default" href="https:\/\/davidbarreiro\.dev\/"\s*>/i
    );
    assert.match(html, /<meta name="robots" content="index, follow/i);
    assert.match(html, /href="\/cv-professional\.pdf"/i);
    assert.doesNotMatch(html, /href="\/cv-one-page\.pdf"/i);
    assert.doesNotMatch(html, /href="\/cv-jsonresume\.pdf"/i);
    assert.doesNotMatch(html, /dist\/styles\.css/i);
  }
});

test('theme alternatives stay out of search and the old preview routes redirect', async () => {
  for (const route of ['editorial/index.html', 'dev/index.html', 'es/editorial/index.html', 'es/dev/index.html']) {
    assert.match(await readBuiltPage(route), /<meta name="robots" content="noindex, follow"/i, route);
  }
  const redirects = {
    'v9/index.html': '/dev/',
    'es/v9/index.html': '/es/dev/',
    'v7/index.html': '/',
    'es/v7/index.html': '/es/',
    'live/index.html': '/',
    'es/live/index.html': '/es/',
    'v6/index.html': '/editorial/'
  };
  for (const [route, target] of Object.entries(redirects)) {
    const escaped = target.replace(/\//g, '\\/');
    assert.match(await readBuiltPage(route), new RegExp(`http-equiv="refresh" content="0;url=${escaped}"`, 'i'), route);
  }
  // Live is the default theme at the root.
  assert.match(await readBuiltPage('index.html'), /class="[^"]*cy-/i);
});
