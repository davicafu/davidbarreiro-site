const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8');
}

function getEmbeddedResumeData(html) {
  const scriptMatch = html.match(/<script[^>]*id="resume-data"[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(scriptMatch, 'Embedded resume-data script was not found');
  return JSON.parse(scriptMatch[1]);
}

function parseJsonWithOptionalBom(raw) {
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

test('embedded resume payload matches source JSON essentials for EN and ES', async () => {
  const [enHtml, esHtml, enSourceRaw, esSourceRaw] = await Promise.all([
    readProjectFile('_site/index.html'),
    readProjectFile('_site/es/index.html'),
    readProjectFile('resume.json'),
    readProjectFile('resume.es.json')
  ]);

  const enPayload = getEmbeddedResumeData(enHtml);
  const esPayload = getEmbeddedResumeData(esHtml);
  const enSource = parseJsonWithOptionalBom(enSourceRaw);
  const esSource = parseJsonWithOptionalBom(esSourceRaw);

  assert.equal(enPayload.basics?.email, enSource.basics?.email);
  assert.equal(esPayload.basics?.email, esSource.basics?.email);
  assert.equal(enPayload.basics?.label, enSource.basics?.label);
  assert.equal(esPayload.basics?.label, esSource.basics?.label);
  assert.equal(Array.isArray(enPayload.portfolio), true);
  assert.equal(Array.isArray(esPayload.portfolio), true);
  assert.ok(enPayload.portfolio.length > 0, 'EN portfolio should not be empty');
  assert.ok(esPayload.portfolio.length > 0, 'ES portfolio should not be empty');
});
