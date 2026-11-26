const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8');
}

function parseJsonWithOptionalBom(raw) {
  return JSON.parse(raw.replace(/^﻿/, ''));
}

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

test('home pages render the resume essentials for EN and ES', async () => {
  for (const [page, source] of [
    ['_site/index.html', 'resume.json'],
    ['_site/es/index.html', 'resume.es.json']
  ]) {
    const [html, raw] = await Promise.all([readProjectFile(page), readProjectFile(source)]);
    const resume = parseJsonWithOptionalBom(raw);

    assert.ok(html.includes(`mailto:${resume.basics.email}`), `${page} contact email missing`);
    assert.ok(resume.portfolio.length > 0, `${source} portfolio should not be empty`);
    for (const project of resume.portfolio) {
      assert.ok(html.includes(escapeHtml(project.name)), `${page} project missing: ${project.name}`);
    }
    for (const job of resume.work) {
      assert.ok(html.includes(escapeHtml(job.name)), `${page} job missing: ${job.name}`);
    }
  }
});
