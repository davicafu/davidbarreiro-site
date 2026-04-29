export const PDF_MODE = new URLSearchParams(window.location.search).has('pdf');
export const reducedMotion = PDF_MODE || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const CURRENT_YEAR = new Date().getFullYear();
export const palette = ['#7dd3fc', '#86efac', '#c4b5fd', '#fde68a', '#fdba74', '#fda4af', '#bef264', '#f9a8d4'];
export const categoryColorMap = {
  'programming languages': '#93c5fd',
  databases: '#86efac',
  'data processing': '#c4b5fd',
  'ai engineering': '#fde68a',
  'infra & devops': '#fdba74',
  cloud: '#fda4af',
  'analysis & visualization': '#bef264',
  'analysis y visualization': '#bef264',
  observability: '#bef264'
};

export const appState = {
  resumeData: null,
  jobs: [],
  skillGroups: [],
  flow: []
};