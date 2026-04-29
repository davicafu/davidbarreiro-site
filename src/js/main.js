import { PDF_MODE, appState } from './state.js';
import { validateResumeData } from './utils.js';
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
import { timeline } from './timeline.js';
import { bubbles } from './bubbles.js';
import { dataFlow } from './flow.js';

if (PDF_MODE) {
  document.body.classList.add('pdf-mode');
}

const yearNode = document.getElementById('year');
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

async function renderAll() {
  try {
    const response = await fetch('./resume.json');
    appState.resumeData = await response.json();
    const schemaWarnings = validateResumeData(appState.resumeData);
    if (schemaWarnings.length) {
      console.warn('resume.json validation warnings:');
      schemaWarnings.forEach(item => console.warn(`- ${item}`));
    }
  } catch (error) {
    console.warn('Could not load resume.json', error);
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
  timeline();
  bubbles();
  dataFlow();
}

function initApp() {
  renderAll();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      timeline();
      bubbles();
      dataFlow();
    }, 180);
  });
}

initApp();