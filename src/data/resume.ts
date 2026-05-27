import resumeEn from '../../resume.json';
import resumeEs from '../../resume.es.json';

import type { Locale } from '../lib/locale';

export type ResumeData = typeof resumeEn;
export type ResumeBasics = ResumeData['basics'];
export type ResumePortfolioItem = ResumeData['portfolio'][number];

const DEFAULT_GITHUB_URL = 'https://github.com/davicafu';
const DEFAULT_LINKEDIN_URL = 'https://www.linkedin.com/in/david-barreiro-s/';

const resumes: Record<Locale, ResumeData> = {
  en: resumeEn,
  es: resumeEs
};

export function getResume(locale: Locale): ResumeData {
  return resumes[locale];
}

export function getSocialLinks(basics: ResumeBasics) {
  const profiles = Array.isArray(basics?.profiles) ? basics.profiles : [];

  return {
    githubUrl:
      profiles.find((profile) => profile.network?.toLowerCase().includes('github'))?.url ||
      DEFAULT_GITHUB_URL,
    linkedinUrl:
      profiles.find((profile) => profile.network?.toLowerCase().includes('linkedin'))?.url ||
      DEFAULT_LINKEDIN_URL
  };
}
