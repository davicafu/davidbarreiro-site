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
    assert.match(html, /id="resume-data"/i);
    assert.match(html, /href="\/cv-one-page\.pdf"/i);
    assert.match(html, /href="\/cv-professional\.pdf"/i);
    assert.match(html, /href="\/cv-jsonresume\.pdf"/i);
    assert.doesNotMatch(html, /dist\/styles\.css/i);
  }
});
