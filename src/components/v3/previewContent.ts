/**
 * Shared, factual content for the redesign previews under /v3/.
 * Everything comes from resume.json / resume.es.json; short copy is a condensed
 * rewrite of that content (approved by the owner), never new claims.
 */
import { getResume, getSocialLinks } from '../../data/resume';
import { deriveSystemDesignFlow } from '../../data/system-design';
import type { Locale } from '../../lib/locale';

export interface PreviewEntry {
  kind: 'work' | 'education';
  organisation: string;
  role: string;
  start: number;
  end: number | null;
  period: string;
  summary: string;
  tech: string[];
  highlights: string[];
}

export interface PreviewCertificate {
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface PreviewSkill {
  name: string;
  level: string;
  logo: string;
  certifications: PreviewCertificate[];
}

export interface PreviewStage {
  name: string;
  detail: string;
  tech: string[];
}

export interface PreviewProject {
  name: string;
  url: string;
  oneLiner: string;
  tags: string[];
  allTags: string[];
}

const toCertificate = (cert: {
  name?: string;
  issuer?: string;
  date?: string;
  url?: string;
}): PreviewCertificate => ({
  name: cert.name || '',
  issuer: cert.issuer || '',
  date: cert.date || '',
  url: cert.url || ''
});

// resume.json stores logos as "./assets/..."; pages live at nested routes, so make them root-relative.
const toPublicPath = (value: unknown) => (typeof value === 'string' ? value.replace(/^\.\//, '/') : '');

const PROJECT_ONE_LINERS: Record<Locale, Record<string, string>> = {
  en: {
    'go-auth-kit':
      'Production-ready Go authentication module: JWT or cookie sessions, OAuth, RBAC and audit logs.',
    'Concurrent Worker Runtime':
      'Async job runtime in Go with jittered retries, backpressure, a dead-letter queue and graceful shutdown.',
    'Go Microservice Suite (gRPC + REST)':
      'Reference microservice system: internal gRPC with protobuf behind a public REST gateway.',
    'Event Analytics Pipeline':
      'Event-driven analytics: ingestion, ETL and metrics with Go, DuckDB, ClickHouse and PostgreSQL.',
    observekit: 'End-to-end observability stack: OpenTelemetry, tracing, Prometheus, Grafana and Superset.',
    'CLI Suite':
      'Go CLI toolkit for engineering workflows: data quality, API audits, benchmarks and migrations.',
    'CLI Games Collection':
      'Terminal games as an architecture lab: game loops, collision systems and reusable engine patterns.'
  },
  es: {
    'go-auth-kit':
      'Módulo de autenticación en Go listo para producción: sesiones JWT o cookies, OAuth, RBAC y auditoría.',
    'Concurrent Worker Runtime':
      'Runtime de trabajos asíncronos en Go con reintentos con jitter, backpressure, DLQ y apagado controlado.',
    'Go Microservice Suite (gRPC + REST)':
      'Sistema de microservicios de referencia: gRPC interno con protobuf tras una pasarela REST pública.',
    'Proceso de analítico de eventos':
      'Analítica orientada a eventos: ingesta, ETL y métricas con Go, DuckDB, ClickHouse y PostgreSQL.',
    observekit:
      'Stack de observabilidad de extremo a extremo: OpenTelemetry, trazas, Prometheus, Grafana y Superset.',
    'CLI Suite':
      'Toolkit de CLI en Go para flujos de ingeniería: calidad de datos, auditoría de APIs, benchmarks y migraciones.',
    'CLI Games Collection':
      'Juegos de terminal como laboratorio de arquitectura: game loops, colisiones y patrones de motor reutilizables.'
  }
};

const COPY = {
  en: {
    role: 'Senior Software Engineer',
    positioning: 'Data platforms & Go backend',
    summary:
      'I design and build real-time data platforms (Kafka, Spark, ClickHouse) and the Go and Java backends around them, with an architecture that stays maintainable as it grows.',
    present: 'present',
    contactCta: 'Get in touch',
    cvCta: 'Download CV',
    cvNote: 'PDF',
    sections: {
      experience: 'Experience',
      method: 'How I design data platforms',
      projects: 'Projects',
      skills: 'Skills',
      contact: 'Contact'
    },
    contactTitle: "Let's build something with data",
    contactText: 'Open to data engineering, streaming platforms and software architecture roles and projects.'
  },
  es: {
    role: 'Ingeniero de Software Senior',
    positioning: 'Plataformas de datos y backend en Go',
    summary:
      'Diseño y construyo plataformas de datos en tiempo real (Kafka, Spark, ClickHouse) y los backends en Go y Java que las rodean, con una arquitectura que sigue siendo mantenible a medida que crece.',
    present: 'actualidad',
    contactCta: 'Contactar',
    cvCta: 'Descargar CV',
    cvNote: 'PDF, en inglés',
    sections: {
      experience: 'Experiencia',
      method: 'Cómo diseño plataformas de datos',
      projects: 'Proyectos',
      skills: 'Skills',
      contact: 'Contacto'
    },
    contactTitle: 'Construyamos algo con datos',
    contactText:
      'Abierto a puestos y proyectos de ingeniería de datos, plataformas streaming y arquitectura de software.'
  }
} as const;

const year = (value: string | undefined) => (value ? Number.parseInt(value.slice(0, 4), 10) : null);

export function getPreviewContent(locale: Locale) {
  const resume = getResume(locale);
  const copy = COPY[locale];
  const { githubUrl, linkedinUrl } = getSocialLinks(resume.basics);

  const work: PreviewEntry[] = resume.work.map((job) => {
    const start = year(job.startDate) ?? 0;
    const end = year('endDate' in job ? (job.endDate as string) : undefined);
    return {
      kind: 'work',
      organisation: job.name,
      role: job.position,
      start,
      end,
      period: `${start}–${end ?? copy.present}`,
      summary: job.summary,
      tech: Array.isArray(job.tech) ? job.tech : [],
      highlights: Array.isArray(job.highlights) ? job.highlights : []
    };
  });

  const education: PreviewEntry[] = resume.education.map((item) => {
    const start = year(item.startDate) ?? 0;
    const end = year(item.endDate);
    return {
      kind: 'education',
      organisation: item.institution,
      role: `${item.studyType} · ${item.area}`,
      start,
      end,
      period: `${start}–${end ?? copy.present}`,
      summary: '',
      tech: Array.isArray(item.tech) ? item.tech : [],
      highlights: []
    };
  });

  const stages: PreviewStage[] = deriveSystemDesignFlow(resume.skills, locale).map((stage) => ({
    name: stage.name,
    detail: stage.detail,
    tech: stage.tech
  }));

  const projects: PreviewProject[] = resume.portfolio.map((project) => ({
    name: project.name,
    url: 'url' in project && typeof project.url === 'string' ? project.url : '',
    oneLiner: PROJECT_ONE_LINERS[locale][project.name] ?? project.description,
    tags: Array.isArray(project.highlights) ? project.highlights.slice(0, 4) : [],
    allTags: Array.isArray(project.highlights) ? project.highlights : []
  }));

  const skillGroups = resume.skills.map((group) => ({
    name: group.name,
    level: group.level || '',
    keywords: (group.keywords || []).map(
      (keyword): PreviewSkill =>
        typeof keyword === 'string'
          ? { name: keyword, level: '', logo: '', certifications: [] }
          : {
              name: keyword.name || '',
              level: keyword.level || '',
              logo: toPublicPath(keyword.logo),
              certifications:
                'certifications' in keyword && Array.isArray(keyword.certifications)
                  ? keyword.certifications.map(toCertificate)
                  : []
            }
    )
  }));

  const skills = resume.skills.map((group) => ({
    name: group.name,
    keywords: (group.keywords || []).map((keyword) =>
      typeof keyword === 'string' ? keyword : (keyword as { name?: string }).name || ''
    )
  }));

  return {
    locale,
    name: resume.basics.name,
    image: resume.basics.image,
    email: resume.basics.email,
    githubUrl,
    linkedinUrl,
    copy,
    cvUrl: '/cv-one-page.pdf',
    work,
    education,
    timeline: [...work, ...education].sort((a, b) => b.start - a.start),
    stages,
    projects,
    skills,
    skillGroups,
    certificates: (resume.certificates || []).map((cert) => cert.name),
    certificateDetails: (resume.certificates || []).map(toCertificate),
    cvOptions: [
      { href: '/cv-one-page.pdf', key: 'onePage' },
      { href: '/cv-professional.pdf', key: 'professional' },
      { href: '/cv-jsonresume.pdf', key: 'jsonresume' }
    ] as const
  };
}

export type PreviewContent = ReturnType<typeof getPreviewContent>;
