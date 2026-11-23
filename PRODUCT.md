# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences, with no single one dominant (confirmed by the owner):

- **Recruiters / HR**: non-technical, scanning for roughly 20 seconds. Job: understand who David is, where he has worked, download the CV and get in touch.
- **Tech leads / CTOs**: evaluating technical depth. Job: judge how he designs data platforms and backend systems, and inspect real repositories.
- **Freelance clients**: looking for someone to solve a concrete problem. Job: understand what he offers and how to contact him.

The site is bilingual: English at `/` and Spanish at `/es/`.

## Product Purpose

Personal portfolio and CV site of David Barreiro Salgueiro, Senior Software Engineer. It exists to make the profile understandable at a glance for any of the three audiences, prove it with real work and lead to contact (email, LinkedIn, GitHub) or a CV download. Success means a visitor leaves knowing his positioning and has a clear path to reach him.

## Positioning

Weighted roughly **60% data platforms** (real-time and streaming: Kafka, Spark, ClickHouse) and **40% Go backend and software architecture** (clean and hexagonal architecture, distributed systems, microservices), as stated by the owner. His own method for designing data platforms ("How I design data platforms") and an education and work history that interleave are the parts no neighbouring portfolio can truthfully copy.

## Operating Context

- Visitors arrive from LinkedIn, GitHub, job applications and direct links, on desktop and mobile.
- Three CV PDFs exist: `cv-one-page.pdf`, `cv-professional.pdf` and `cv-jsonresume.pdf`. All of them are in English; there is no Spanish CV.
- Public repositories are linked from portfolio cards, for example `github.com/davicafu/go-auth-kit`.

## Capabilities and Constraints

- Astro static site with Tailwind and vanilla JS, using D3 for the interactive visuals. It is deployed via GitHub Actions to Vercel.
- `resume.json` / `resume.es.json` are the single source of content: basics, work, education, skills, portfolio, certificates and languages.
- Any alternative design must keep **feature parity** with the current site: language toggle, section navigation, CV downloads, portfolio with repository links and highlight filter, the interactive data-platform flow, the education and work timeline, the skills chart with legend and keyword panel, contact links and SEO metadata.
- The current design must stay untouched while alternatives are explored. Alternatives live on separate routes.

## Brand Commitments

- Name: David Barreiro Salgueiro. Domain: davidbarreiro.dev.
- Contact channels: email, LinkedIn (`/in/david-barreiro-s/`), GitHub (`davicafu`).

## Evidence on Hand

- Work history: SDG Group (Senior Software Engineer, 2022–now), Altia (2019–2022), Emetel (2018–2019) and Indra Software Labs (2014–2018).
- Education: a degree from USC and a master's from UNIR.
- Certificates: ClickHouse Certified Developer, AWS Certified SysOps Administrator, Cloudera Spark & Hadoop and Oracle 11g Performance Tuning.
- Seven portfolio projects. Four of them have public repositories.
- Languages: Spanish and Galician (native), English (intermediate).
- No metrics, testimonials, client names or quantified outcomes exist. **Do not fabricate any.** The owner allows rewriting and condensing copy taken from `resume.json`, provided it stays factually equivalent.

## Product Principles

1. Scannable in 20 seconds: positioning, experience and contact come first, and depth follows for those who want it.
2. Show, don't claim: real repositories, real work history and the data-platform method carry the proof.
3. Data platforms lead and backend architecture supports, matching the 60/40 positioning.
4. Every interactive visual must also work as readable content, with keyboard and screen-reader access.
5. English and Spanish are equals: no untranslated UI text on the Spanish page.
