export function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function normalizeLogoPath(value) {
  const logo = safeText(value, '');
  if (!logo) return '';
  if (isHttpUrl(logo)) return logo;
  if (logo.startsWith('./assets/')) return `/${logo.slice(2)}`;
  if (logo.startsWith('assets/')) return `/${logo}`;
  return logo;
}

export function normalizeKeywordItem(item) {
  const normalizeCert = (cert) => {
    if (typeof cert === 'string') {
      return isHttpUrl(cert) ? { name: 'Credential', url: cert } : { name: cert, url: '' };
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
        ? item.logo.map(normalizeLogoPath).filter(Boolean)
        : normalizeLogoPath(item.logo)
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
