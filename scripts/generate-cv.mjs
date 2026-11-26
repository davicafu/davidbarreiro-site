// Renders cv-professional.pdf from resume.json with headless Chrome/Brave.
// Usage: node ./scripts/generate-cv.mjs   (override the browser with CHROME_PATH)
import { Buffer } from 'node:buffer';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resumePath = path.join(projectRoot, 'resume.json');
const outputPath = path.join(projectRoot, 'cv-professional.pdf');
const SITE_URL = 'https://davidbarreiro.dev';
const MAX_PAGES = 2;

// Copied from PROJECT_ONE_LINERS.en in src/components/v3/previewContent.ts; keep in sync.
const PROJECT_ONE_LINERS = {
  'go-auth-kit':
    'Production-ready Go authentication module: JWT or cookie sessions, OAuth, RBAC and audit logs.',
  'Concurrent Worker Runtime':
    'Async job runtime in Go with jittered retries, backpressure, a dead-letter queue and graceful shutdown.',
  'Go Microservice Suite (gRPC + REST)':
    'Reference microservice system: internal gRPC with protobuf behind a public REST gateway.',
  'Event Analytics Pipeline':
    'Event-driven analytics: ingestion, ETL and metrics with Go, DuckDB, ClickHouse and PostgreSQL.',
  observekit: 'End-to-end observability stack: OpenTelemetry, tracing, Prometheus, Grafana and Superset.',
  'CLI Suite': 'Go CLI toolkit for engineering workflows: data quality, API audits, benchmarks and migrations.',
  'CLI Games Collection':
    'Terminal games as an architecture lab: game loops, collision systems and reusable engine patterns.'
};

const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function findBrowser() {
  const found = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `No Chrome/Brave/Chromium executable found. Set CHROME_PATH. Tried:\n  ${BROWSER_CANDIDATES.join('\n  ')}`
    );
  }
  return found;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function link(url, text) {
  return url ? `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>` : escapeHtml(text);
}

// Decorative 24x24 monochrome glyphs for the header contacts; they inherit the text colour.
const ICON_PATHS = {
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  phone:
    '<path d="M6.6 3.5h2.6l1.4 4.2-2 1.5a12 12 0 0 0 6.2 6.2l1.5-2 4.2 1.4v2.6a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>',
  location: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  linkedin:
    '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M8 10.5V16M8 7.6v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.3-2.6S16 11.2 16 13v3"/>',
  github:
    '<path d="M9 19c-4 1.3-4-2-5.5-2.5M14.5 21v-3.4c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.3 2.9 5.3 3.2 5.3 3.2a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 3.9 9.6c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'
};

function icon(name) {
  const paths = ICON_PATHS[name];
  return paths
    ? `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`
    : '';
}

function contact(iconName, url, text) {
  return `<span class="contact">${icon(iconName)}${link(url, text)}</span>`;
}

// "2026-10" -> "Oct 2026"; "2008" -> "2008"; missing -> "Current".
function formatDate(value) {
  if (!value) return 'Current';
  const [year, month] = String(value).split('-');
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

function displayUrl(url) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function section(title, body) {
  return `<section><h2><span>${escapeHtml(title)}</span></h2>${body}</section>`;
}

function renderHeader(basics, photoUrl) {
  const location = [basics.location?.city, basics.location?.countryCode].filter(Boolean).join(', ');
  const contacts = [
    contact('web', SITE_URL, displayUrl(SITE_URL)),
    basics.email && contact('email', `mailto:${basics.email}`, basics.email),
    basics.phone && contact('phone', `tel:${basics.phone.replace(/\s+/g, '')}`, basics.phone),
    ...(basics.profiles || []).map((profile) =>
      contact(String(profile.network || '').toLowerCase(), profile.url, displayUrl(profile.url))
    )
  ].filter(Boolean);
  const summary = String(basics.summary || '')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');

  return `<header>
    <div class="identity">
      <h1>${escapeHtml(basics.name)}</h1>
      <p class="label">${escapeHtml(basics.label)}</p>
      <p class="location">${location ? `<span class="contact">${icon('location')}${escapeHtml(location)}</span>` : ''}</p>
      <p class="contacts">${contacts.join('<span class="sep">·</span>')}</p>
    </div>
    ${photoUrl ? `<img class="photo" src="${escapeHtml(photoUrl)}" alt="">` : ''}
  </header>
  <p class="summary">${escapeHtml(summary)}</p>`;
}

function renderSkills(skills) {
  const groups = skills
    .map((group) => {
      const keywords = (group.keywords || []).map((keyword) =>
        escapeHtml(typeof keyword === 'string' ? keyword : keyword.name)
      );
      return `<div class="skill">
        <h3>${escapeHtml(group.name)}</h3>
        <p class="level">${escapeHtml(group.level)}</p>
        <p class="keywords">${keywords.join(' · ')}</p>
      </div>`;
    })
    .join('');
  return section('Skills', `<div class="skills">${groups}</div>`);
}

function renderWork(work) {
  const entries = work
    .map(
      (job) => `<article class="entry">
        <p class="date">${formatDate(job.startDate)} - ${formatDate(job.endDate)}</p>
        <p class="role"><strong>${escapeHtml(job.position)}</strong> at ${escapeHtml(job.name)}</p>
        ${job.summary ? `<p class="entry-summary">${escapeHtml(job.summary)}</p>` : ''}
        <ul>${(job.highlights || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </article>`
    )
    .join('');
  return section('Work experience', entries);
}

function renderProjects(projects) {
  const lines = projects
    .map((project) => {
      const description = PROJECT_ONE_LINERS[project.name] ?? project.description;
      return `<li><strong>${link(project.url, project.name)}</strong> — ${escapeHtml(description)}</li>`;
    })
    .join('');
  return section('Projects', `<ul class="compact">${lines}</ul>`);
}

function renderEducation(education) {
  const entries = education
    .map(
      (item) => `<p class="line"><span class="date">${formatDate(item.startDate)} - ${formatDate(item.endDate)}</span>
        <strong>${escapeHtml([item.studyType, item.area].filter(Boolean).join(' '))}</strong> at ${escapeHtml(item.institution)}</p>`
    )
    .join('');
  return section('Education', entries);
}

function renderCertificates(certificates) {
  const sorted = [...certificates].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const lines = sorted
    .map((cert) => {
      const parts = [
        `<span class="date">${escapeHtml(cert.date)}</span>`,
        `<strong>${link(cert.url, cert.name)}</strong>`,
        cert.issuer && escapeHtml(cert.issuer)
      ].filter(Boolean);
      return `<p class="line">${parts.join(' · ')}</p>`;
    })
    .join('');
  return section('Certificates', lines);
}

function renderLanguages(languages) {
  const items = languages.map(
    (item) => `<strong>${escapeHtml(item.language)}</strong> <span class="muted">(${escapeHtml(item.fluency)})</span>`
  );
  return section('Languages', `<p class="line">${items.join(' · ')}</p>`);
}

const STYLES = `
  @page { size: A4; margin: 12mm 13mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --ink: #3a3f45; --muted: #7b8087; --accent: #f26b1d; --link: #1a8fe3; --rule: #c9ccd0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 9.5pt; line-height: 1.32; color: var(--ink); }
  a { color: var(--link); text-decoration: none; }
  header { display: flex; justify-content: space-between; gap: 6mm; }
  .identity { flex: 1; min-width: 0; }
  h1 { font-size: 25pt; font-weight: 300; line-height: 1.05; letter-spacing: -0.3pt; }
  .label { font-size: 12pt; margin-top: 1mm; }
  .location { color: var(--muted); margin-top: 0.6mm; }
  .contacts { margin-top: 1.4mm; display: flex; flex-wrap: wrap; }
  .contacts a { white-space: nowrap; }
  .contact { display: inline-flex; align-items: center; gap: 1mm; white-space: nowrap; }
  .icon { width: 1.05em; height: 1.05em; flex: none; fill: none; stroke: var(--muted); stroke-width: 1.8;
          stroke-linecap: round; stroke-linejoin: round; }
  .sep { color: var(--muted); margin: 0 1.6mm; }
  .photo { width: 26mm; height: 26mm; object-fit: cover; border-radius: 1.5mm; flex: none; }
  .summary { margin-top: 2.6mm; }
  section { margin-top: 3mm; }
  h2 { display: flex; align-items: center; gap: 3mm; color: var(--accent); font-size: 8.5pt; font-weight: 700;
       text-transform: uppercase; letter-spacing: 0.3pt; margin-bottom: 1.4mm; break-after: avoid; }
  h2::after { content: ""; flex: 1; border-top: 0.5pt solid var(--rule); }
  .skills { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.6mm 5mm; }
  .skill { min-width: 0; overflow-wrap: anywhere; }
  .skill h3 { font-size: 10pt; font-weight: 700; }
  .level { color: var(--muted); font-size: 8.5pt; }
  .keywords { font-size: 8pt; color: #4f6475; margin-top: 0.4mm; }
  .entry { margin-top: 2.2mm; break-inside: avoid; }
  .entry:first-of-type { margin-top: 0; }
  .date { color: var(--muted); }
  .role { break-after: avoid; }
  .role, .entry-summary { break-inside: avoid; }
  .entry-summary { margin-top: 0.3mm; }
  ul { list-style: none; margin-top: 0.6mm; }
  li { position: relative; padding-left: 3.4mm; break-inside: avoid; }
  li::before { content: ""; position: absolute; left: 0.4mm; top: 0.48em; width: 1.3mm; height: 1.3mm; background: #6b7077; }
  ul.compact { margin-top: 0; }
  .line { margin-top: 0.5mm; }
  .muted { color: var(--muted); }
`;

function renderHtml(resume, photoUrl) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(resume.basics.name)} - CV</title>
<style>${STYLES}</style></head>
<body>
  ${renderHeader(resume.basics, photoUrl)}
  ${renderSkills(resume.skills || [])}
  ${renderWork(resume.work || [])}
  ${renderProjects(resume.portfolio || [])}
  ${renderEducation(resume.education || [])}
  ${renderCertificates(resume.certificates || [])}
  ${renderLanguages(resume.languages || [])}
</body></html>`;
}

const IMAGE_TYPES = { '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

// Inlines a local photo as a data URI so the page needs no file or network access.
async function resolvePhoto(image) {
  if (!image) return '';
  if (/^https?:/.test(image)) return image;
  const localPath = path.join(projectRoot, image.replace(/^\.?\//, ''));
  const type = IMAGE_TYPES[path.extname(localPath).toLowerCase()];
  if (!type || !existsSync(localPath)) {
    console.warn(`Photo not usable at ${localPath}; rendering without it.`);
    return '';
  }
  return `data:${type};base64,${(await readFile(localPath)).toString('base64')}`;
}

// Chrome embeds JPEG as-is but stores other formats as lossless Flate (~30 KB for the photo).
// Re-encoding the photo to JPEG through a screenshot keeps the PDF small.
async function toJpeg(browser, dataUri) {
  if (!dataUri.startsWith('data:') || dataUri.startsWith('data:image/jpeg')) return dataUri;
  const size = 224;
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: size, height: size });
    await page.setContent(
      `<body style="margin:0"><img src="${dataUri}" style="display:block;width:${size}px;height:${size}px;object-fit:cover"></body>`,
      { waitUntil: 'load' }
    );
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 85, encoding: 'base64' });
    return `data:image/jpeg;base64,${jpeg}`;
  } finally {
    await page.close();
  }
}

function countPages(pdf) {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
}

const raw = await readFile(resumePath, 'utf8');
const resume = JSON.parse(raw.replace(/^﻿/, ''));

const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true });
try {
  const html = renderHtml(resume, await toJpeg(browser, await resolvePhoto(resume.basics.image)));
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdf = Buffer.from(await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true }));
  const pages = countPages(pdf);
  await writeFile(outputPath, pdf);
  console.log(`Wrote ${path.relative(projectRoot, outputPath)} (${pages} pages, ${Math.round(pdf.length / 1024)} KB)`);
  if (pages > MAX_PAGES) {
    console.error(`Expected at most ${MAX_PAGES} pages, got ${pages}.`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
