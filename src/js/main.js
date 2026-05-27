import { PDF_MODE, appState } from './state.js';
import { validateResumeData } from './utils.js';
import { detectLocale, applyStaticTranslations } from './i18n.js';
import { scheduleVisualHydration } from './visuals-loader.js';
import {
  mapResumeToViewModel,
  renderHeader,
  renderMetrics,
  renderProjects,
  renderLegend,
  revealOnScroll,
  counters,
  spotlight
} from './render.js';

if (PDF_MODE) {
  document.body.classList.add('pdf-mode');
}

const yearNode = document.getElementById('year');
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

async function bootstrapCore() {
  appState.locale = detectLocale();
  applyStaticTranslations(appState.locale);
  const resumeDataNode = document.getElementById('resume-data');

  try {
    appState.resumeData = resumeDataNode?.textContent ? JSON.parse(resumeDataNode.textContent) : {};
    const schemaWarnings = validateResumeData(appState.resumeData);
    if (schemaWarnings.length) {
      console.warn('Embedded resume data validation warnings:');
      schemaWarnings.forEach((item) => console.warn(`- ${item}`));
    }
  } catch (error) {
    console.warn('Could not parse embedded resume data', error);
    appState.resumeData = {};
  }

  const { basics, portfolio } = mapResumeToViewModel(appState.resumeData || {});
  renderHeader(basics || {});
  renderMetrics(basics || {}, appState.resumeData?.meta || {});
  renderProjects(portfolio || []);
  renderLegend();
  revealOnScroll();
  counters();
  spotlight();
}

async function initApp() {
  await bootstrapCore();

  const visualsController = await scheduleVisualHydration([
    {
      id: 'timeline',
      mount: async () => {
        const { timeline } = await import('./timeline.js');
        timeline();
        return { refresh: timeline };
      }
    },
    {
      id: 'bubbles',
      mount: async () => {
        const { bubbles } = await import('./bubbles.js');
        return bubbles();
      }
    },
    {
      id: 'flow',
      mount: async () => {
        const { dataFlow } = await import('./flow.js');
        return dataFlow();
      }
    }
  ]);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      visualsController.refreshMounted();
    }, 180);
  });
}

initApp();
