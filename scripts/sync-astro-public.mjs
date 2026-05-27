import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

const mirroredEntries = [
  'assets',
  'favicon',
  'resume.json',
  'resume.es.json',
  'cv-one-page.pdf',
  'cv-professional.pdf',
  'cv-jsonresume.pdf',
  'robots.txt',
  'sitemap.xml'
];

await mkdir(publicDir, { recursive: true });

for (const entry of mirroredEntries) {
  const source = path.join(projectRoot, entry);
  const destination = path.join(publicDir, entry);

  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
}
