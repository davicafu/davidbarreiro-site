export function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

export function normalizeKeywordItem(item) {
  const normalizeCert = cert => {
    if (typeof cert === 'string') {
      return isHttpUrl(cert)
        ? { name: 'Credential', url: cert }
        : { name: cert, url: '' };
    }
    if (cert && typeof cert === 'object') {
      return {
        name: safeText(cert.name, safeText(cert.title, 'Certification')),
        url: safeText(cert.url, '')
      };
    }
    return null;
  };

  if (typeof item === 'string') return { name: item, level: '', certifications: [], notes: '', logo: '' };
  if (item && typeof item === 'object') {
    let certs = [];
    if (Array.isArray(item.certifications)) {
      const raw = item.certifications;
      for (let i = 0; i < raw.length; i += 1) {
        const current = raw[i];
        if (typeof current === 'string' && !isHttpUrl(current)) {
          const next = raw[i + 1];
          if (typeof next === 'string' && isHttpUrl(next)) {
            certs.push({ name: current, url: next });
            i += 1;
            continue;
          }
        }
        const normalized = normalizeCert(current);
        if (normalized) certs.push(normalized);
      }
    }
    return {
      name: safeText(item.name, safeText(item.keyword, 'Skill')).replace(/\*+\s*$/, ''),
      level: safeText(item.level, ''),
      certifications: certs,
      notes: safeText(item.notes, safeText(item.summary, '')),
      logo: Array.isArray(item.logo)
        ? item.logo.map(x => safeText(x, '')).filter(Boolean)
        : safeText(item.logo, '')
    };
  }
  return { name: 'Skill', level: '', certifications: [], notes: '', logo: '' };
}

export function parseDateToYear(value, fallbackYear) {
  if (!value) return fallbackYear;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallbackYear;
  return parsed.getFullYear() + parsed.getMonth() / 12;
}

export function validateResumeData(data) {
  const warnings = [];
  if (!data || typeof data !== 'object') {
    return ['resume.json root must be a JSON object.'];
  }
  if (!data.basics || typeof data.basics !== 'object') {
    warnings.push('Missing or invalid `basics` section.');
  }
  if (data.work && !Array.isArray(data.work)) warnings.push('`work` should be an array.');
  if (data.education && !Array.isArray(data.education)) warnings.push('`education` should be an array.');
  if (data.skills && !Array.isArray(data.skills)) warnings.push('`skills` should be an array.');
  if (data.portfolio && !Array.isArray(data.portfolio)) warnings.push('`portfolio` should be an array.');
  if (Array.isArray(data.skills)) {
    data.skills.forEach((group, idx) => {
      if (!group || typeof group !== 'object') {
        warnings.push(`skills[${idx}] should be an object.`);
        return;
      }
      if (!Array.isArray(group.keywords)) warnings.push(`skills[${idx}].keywords should be an array.`);
    });
  }
  return warnings;
}

export function deriveFlow(skills) {
  const allKeywords = skills.flatMap(group => group.keywords || []);
  const has = term => allKeywords.some(k => {
    const name = typeof k === 'string' ? k : (k?.name || '');
    return name.toLowerCase().includes(term.toLowerCase());
  });
  return [
    {
      name: 'Sources',
      detail: 'Upstream applications, APIs, transactional databases, and event producers.',
      impact: 'Decoupled entry points designed to enforce evolvable domain data contracts.',
      tech: ['Apps', 'APIs', 'DBs', 'CDC / Agents']
    },
    {
      name: 'Ingestion',
      detail: 'Reliable data intake and continuous event collection.',
      impact: 'Backpressure-aware ingestion layer with replay-friendly patterns for fault tolerance.',
      tech: [has('kafka') ? 'Kafka' : 'Message Queues', has('connect') ? 'Kafka Connect' : 'Connectors', 'REST / gRPC']
    },
    {
      name: 'Streaming Backbone',
      detail: 'Centralized event backbone for real-time data distribution.',
      impact: 'Topic-driven architecture enabling schema governance and fully decoupled microservices.',
      tech: ['Kafka Topics', 'Schema', 'Event Bus']
    },
    {
      name: 'Processing',
      detail: 'Real-time transformation, enrichment, and stateful aggregation.',
      impact: 'Low-latency processing with deterministic, scalable, and testable pipelines.',
      tech: ['Go Workers', has('flink') ? 'Flink' : 'Streaming Engines', has('spark') ? 'Spark' : 'Scala / Python']
    },
    {
      name: 'Storage & Serving',
      detail: 'Analytical (OLAP) and operational (OLTP) data serving layers.',
      impact: 'Optimized serving layer for high-concurrency reads and deep operational visibility.',
      tech: [has('postgres') ? 'PostgreSQL' : 'Relational DB', has('clickhouse') ? 'ClickHouse' : 'Analytics DB', 'Elasticsearch']
    },
    {
      name: 'Consumers & Observability',
      detail: 'Data products, customer-facing APIs, alerts, and system monitoring.',
      impact: 'Unified operational insights and product consumption from a single reliable data plane.',
      tech: ['Grafana', 'Data APIs', 'Dashboards', 'Metrics / Logs']
    }
  ];
}