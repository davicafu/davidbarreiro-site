export const SITE_URL = 'https://davidbarreiro.dev';

export const LOCALES = ['en', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

interface LocaleMetadata {
  canonical: string;
  description: string;
  ogDescription: string;
  ogLocale: string;
  ogLocaleAlternate: string;
  ogTitle: string;
  title: string;
}

const localeMetadata: Record<Locale, LocaleMetadata> = {
  en: {
    canonical: `${SITE_URL}/`,
    description:
      'Senior Software Engineer specialized in distributed systems, data platforms and streaming architecture. Interactive CV with projects, skills and experience.',
    ogDescription:
      'Distributed systems, data platforms and streaming architecture. Explore experience, stack and technical portfolio.',
    ogLocale: 'en_US',
    ogLocaleAlternate: 'es_ES',
    ogTitle: 'David Barreiro Salgueiro · Senior Software Engineer',
    title: 'David Barreiro Salgueiro · CV'
  },
  es: {
    canonical: `${SITE_URL}/es/`,
    description:
      'Ingeniero de Software Senior especializado en sistemas distribuidos, plataformas de datos y arquitectura streaming. CV interactivo con experiencia, skills y proyectos.',
    ogDescription:
      'Sistemas distribuidos, plataformas de datos y arquitectura streaming. Explora experiencia, stack y portfolio técnico.',
    ogLocale: 'es_ES',
    ogLocaleAlternate: 'en_US',
    ogTitle: 'David Barreiro Salgueiro · Ingeniero de Software Senior',
    title: 'David Barreiro Salgueiro · CV en Español'
  }
};

export function getLocaleMetadata(locale: Locale): LocaleMetadata {
  return localeMetadata[locale];
}

export function getAlternateLinks() {
  return [
    { href: `${SITE_URL}/`, hreflang: 'en' },
    { href: `${SITE_URL}/es/`, hreflang: 'es' },
    { href: `${SITE_URL}/`, hreflang: 'x-default' }
  ];
}
