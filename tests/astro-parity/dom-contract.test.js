const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

async function readBuiltPage(relativePath) {
  return readFile(path.join(projectRoot, '_site', relativePath), 'utf8');
}

function assertIncludesInOrder(html, markers) {
  let cursor = 0;
  for (const marker of markers) {
    const next = html.indexOf(marker, cursor);
    assert.notEqual(next, -1, `Expected marker not found: ${marker}`);
    cursor = next + marker.length;
  }
}

test('home sections keep the site order and the menu reaches every section', async () => {
  const [enHtml, esHtml] = await Promise.all([readBuiltPage('index.html'), readBuiltPage('es/index.html')]);

  for (const [name, html] of [
    ['en', enHtml],
    ['es', esHtml]
  ]) {
    assertIncludesInOrder(html, [
      'id="capabilities"',
      'id="portfolio"',
      'id="system-design"',
      'id="experience"',
      'id="skills"',
      'id="contact"'
    ]);

    for (const section of ['portfolio', 'experience', 'skills', 'contact']) {
      assert.match(html, new RegExp(`href="#${section}"`), `${name} menu link to #${section} missing`);
    }
    assert.match(html, /<a href="\/" hreflang="en"/i, `${name} EN link mismatch`);
    assert.match(html, /<a href="\/es\/" hreflang="es"/i, `${name} ES link mismatch`);
  }
});
