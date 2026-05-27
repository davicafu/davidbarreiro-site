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

test('critical section and visual mount order remains stable', async () => {
  const [enHtml, esHtml] = await Promise.all([readBuiltPage('index.html'), readBuiltPage('es/index.html')]);

  const routes = [
    { name: 'en', html: enHtml },
    { name: 'es', html: esHtml }
  ];

  for (const { name, html } of routes) {
    assertIncludesInOrder(html, [
      'id="experience"',
      'id="timeline-tip"',
      'id="timeline"',
      'id="skills"',
      'id="legend"',
      'id="bubbles"',
      'id="flow-tip"',
      'id="flow"',
      'id="portfolio"',
      'id="contact"'
    ]);

    assert.match(html, /id="nav-experience"/i, `${name} nav experience missing`);
    assert.match(html, /id="nav-skills"/i, `${name} nav skills missing`);
    assert.match(html, /id="nav-portfolio"/i, `${name} nav portfolio missing`);
    assert.match(html, /id="nav-contact"/i, `${name} nav contact missing`);
    assert.match(html, /id="lang-en-link" href="\/"/i, `${name} EN link mismatch`);
    assert.match(html, /id="lang-es-link" href="\/es\/"/i, `${name} ES link mismatch`);
  }
});
