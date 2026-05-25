import { PDF_MODE, appState } from '/src/js/state.js';
import { validateResumeData } from '/src/js/utils.js';
import { detectLocale, applyStaticTranslations } from '/src/js/i18n.js';
import { scheduleVisualHydration } from '/src/js/visuals-loader.js';
import {
  mapResumeToViewModel,
  renderHeader,
  renderMetrics,
  renderProjects,
  renderLegend,
  revealOnScroll,
  counters,
  spotlight
} from '/src/js/render.js';

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
  const resumeFile = appState.locale === 'es' ? '/resume.es.json' : '/resume.json';

  try {
    const response = await fetch(resumeFile);
    appState.resumeData = await response.json();
    const schemaWarnings = validateResumeData(appState.resumeData);
    if (schemaWarnings.length) {
      console.warn(`${resumeFile} validation warnings:`);
      schemaWarnings.forEach((item) => console.warn(`- ${item}`));
    }
  } catch (error) {
    console.warn(`Could not load ${resumeFile}`, error);
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
        const { timeline } = await import('/src/js/timeline.js');
        timeline();
        return { refresh: timeline };
      }
    },
    {
      id: 'bubbles',
      mount: async () => {
        const { bubbles } = await import('/src/js/bubbles.js');
        return bubbles();
      }
    },
    {
      id: 'flow',
      mount: async () => {
        const { dataFlow } = await import('/src/js/flow.js');
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
