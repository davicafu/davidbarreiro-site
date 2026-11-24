/**
 * Client behaviour for the isometric-infrastructure redesign (/v7/): layer detail card with a
 * guided tour, traffic pause with simulated telemetry, CV menu, project filter and skill tabs.
 * No dependencies; every feature degrades to readable static content when this script does not run.
 */

interface StageInfo {
  name: string;
  detail: string;
  tech: string[];
  service: string;
}

interface CityPayload {
  stages: StageInfo[];
  labels: { stage: string; showing: string };
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const payloadNode = document.getElementById('cy-data');
const payload: CityPayload | null = payloadNode ? JSON.parse(payloadNode.textContent || 'null') : null;
const pad = (n: number) => String(n).padStart(2, '0');

/* ---------------- Layer card ---------------- */
function setupCard(data: CityPayload) {
  const card = document.querySelector<HTMLElement>('[data-card]');
  if (!card) return undefined;
  const num = card.querySelector<HTMLElement>('[data-card-num]');
  const meta = card.querySelector<HTMLElement>('[data-card-meta]');
  const name = card.querySelector<HTMLElement>('[data-card-name]');
  const detail = card.querySelector<HTMLElement>('[data-card-detail]');
  const service = card.querySelector<HTMLElement>('[data-card-service]');
  const tech = card.querySelector<HTMLElement>('[data-card-tech]');
  const triggers = [...document.querySelectorAll<HTMLElement | SVGElement>('[data-stage]')];
  const total = data.stages.length;

  let tourTimer: number | undefined;
  let tourIndex = 0;

  const show = (index: number) => {
    const info = data.stages[index];
    if (!info) return;
    card.classList.remove('is-swapping');
    void card.offsetWidth; // restart the swap animation
    card.classList.add('is-swapping');
    if (num) num.textContent = pad(index + 1);
    if (meta) meta.textContent = data.labels.stage.replace('{n}', String(index + 1)).replace('{n}', String(total));
    if (name) name.textContent = info.name;
    if (detail) detail.textContent = info.detail;
    if (service) service.textContent = info.service;
    if (tech) {
      tech.replaceChildren(
        ...info.tech.map((item) => {
          const chip = document.createElement('span');
          chip.textContent = item;
          return chip;
        })
      );
    }
    triggers.forEach((trigger) => {
      const active = trigger.dataset.stage === String(index);
      trigger.classList.toggle('is-active', active);
      if (trigger instanceof HTMLButtonElement) trigger.setAttribute('aria-pressed', String(active));
    });
  };

  const stopTour = () => {
    window.clearInterval(tourTimer);
    tourTimer = undefined;
  };

  triggers.forEach((trigger) => {
    const index = Number(trigger.dataset.stage);
    const choose = () => {
      stopTour();
      // Announce only what the visitor chose, never the automatic tour.
      card.setAttribute('aria-live', 'polite');
      show(index);
    };
    trigger.addEventListener('click', choose);
    trigger.addEventListener('pointerenter', (event) => {
      if ((event as PointerEvent).pointerType === 'mouse') choose();
    });
    if (!(trigger instanceof HTMLButtonElement)) {
      trigger.addEventListener('keydown', (event) => {
        const { key } = event as KeyboardEvent;
        if (key === 'Enter' || key === ' ') {
          event.preventDefault();
          choose();
        }
      });
    }
  });

  show(0);

  // A short guided tour through the model until the visitor takes over.
  if (!reducedMotion.matches) {
    tourTimer = window.setInterval(() => {
      tourIndex = (tourIndex + 1) % total;
      show(tourIndex);
    }, 4200);
  }
  return stopTour;
}

/* ---------------- Simulated telemetry ---------------- */
// Illustrative numbers only (the panel says so): a bounded random walk that ticks while traffic runs.
function setupTelemetry() {
  const root = document.querySelector<HTMLElement>('[data-telemetry]');
  if (!root) return (_running: boolean) => {};
  const eps = root.querySelector<HTMLElement>('[data-metric="eps"]');
  const p99 = root.querySelector<HTMLElement>('[data-metric="p99"]');
  const lag = root.querySelector<HTMLElement>('[data-metric="lag"]');
  const chart = root.querySelector<SVGPolylineElement>('[data-chart]');
  const SAMPLES = 32;
  const history: number[] = [];
  let rate = 48.2;
  let timer: number | undefined;
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

  const tick = () => {
    rate = clamp(rate + (Math.random() - 0.5) * 3.2, 38, 61);
    history.push(rate);
    if (history.length > SAMPLES) history.shift();
    if (eps) eps.textContent = `${rate.toFixed(1)}k`;
    if (p99) p99.textContent = `${Math.round(9 + (rate - 38) * 0.28 + Math.random() * 3)} ms`;
    if (lag) lag.textContent = String(Math.random() < 0.8 ? 0 : Math.ceil(Math.random() * 4));
    if (chart) {
      const step = 240 / (SAMPLES - 1);
      const offset = SAMPLES - history.length;
      chart.setAttribute(
        'points',
        history.map((v, i) => `${((i + offset) * step).toFixed(1)},${(44 - ((v - 36) / 27) * 40).toFixed(1)}`).join(' ')
      );
    }
  };

  // Seed the chart so it is never empty, even when motion is reduced.
  for (let i = 0; i < SAMPLES; i += 1) tick();

  return (running: boolean) => {
    if (running && timer === undefined) timer = window.setInterval(tick, 1100);
    if (!running && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

/* ---------------- Packet flow (SMIL + CSS) ---------------- */
function setupFlow(stopTour: (() => void) | undefined, setTelemetry: (running: boolean) => void) {
  const scene = document.querySelector<SVGSVGElement>('[data-scene]');
  const button = document.querySelector<HTMLButtonElement>('[data-pause]');
  if (!scene || !button) return;
  const text = button.querySelector<HTMLElement>('[data-pause-text]');
  let userPaused = reducedMotion.matches;
  let visible = true;

  const apply = () => {
    const running = !userPaused && visible;
    if (running) scene.unpauseAnimations();
    else scene.pauseAnimations();
    scene.classList.toggle('is-paused', !running);
    setTelemetry(running);
    button.setAttribute('aria-pressed', String(userPaused));
    if (text) text.textContent = (userPaused ? button.dataset.labelResume : button.dataset.labelPause) || '';
  };

  button.addEventListener('click', () => {
    userPaused = !userPaused;
    if (userPaused) stopTour?.();
    apply();
  });

  // Do not animate what nobody can see.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      apply();
    }).observe(scene);
  }
  apply();
}

/* ---------------- CV menu ---------------- */
function setupCvMenus() {
  document.querySelectorAll<HTMLDetailsElement>('[data-cv]').forEach((menu) => {
    document.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary')?.focus();
      }
    });
  });
}

/* ---------------- Project filter ---------------- */
function setupFilter(showingTemplate: string) {
  const section = document.querySelector<HTMLElement>('[data-projects]');
  if (!section) return;
  const chips = [...section.querySelectorAll<HTMLButtonElement>('[data-tag]')];
  const items = [...section.querySelectorAll<HTMLElement>('.cy-services > li')];
  const count = section.querySelector<HTMLElement>('[data-count]');
  const clear = section.querySelector<HTMLButtonElement>('[data-clear]');
  const empty = section.querySelector<HTMLElement>('[data-empty]');
  const selected = new Set<string>();

  const render = () => {
    let shown = 0;
    items.forEach((item) => {
      const tags: string[] = JSON.parse(item.dataset.tags || '[]');
      const match = selected.size === 0 || tags.some((tag) => selected.has(tag));
      item.hidden = !match;
      if (match) shown += 1;
    });
    chips.forEach((chip) => {
      const tag = chip.dataset.tag || '';
      chip.setAttribute('aria-pressed', String(tag === '' ? selected.size === 0 : selected.has(tag)));
    });
    if (count) count.textContent = showingTemplate.replace('{n}', String(shown)).replace('{n}', String(items.length));
    if (clear) clear.hidden = selected.size === 0;
    if (empty) empty.hidden = shown > 0;
  };

  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag || '';
      if (tag === '') selected.clear();
      else if (selected.has(tag)) selected.delete(tag);
      else selected.add(tag);
      render();
    })
  );
  const more = section.querySelector<HTMLButtonElement>('[data-more]');
  more?.addEventListener('click', () => {
    const expanded = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = (expanded ? more.dataset.labelLess : more.dataset.labelMore) || '';
    section.querySelector('.cy-filter')?.classList.toggle('is-expanded', expanded);
  });
  clear?.addEventListener('click', () => {
    selected.clear();
    render();
  });
  render();
}

/* ---------------- Skill tabs ---------------- */
function setupTabs() {
  const list = document.querySelector<HTMLElement>('.cy-tabs');
  if (!list) return;
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

  const select = (tab: HTMLButtonElement, focus: boolean) => {
    tabs.forEach((other) => {
      const active = other === tab;
      other.setAttribute('aria-selected', String(active));
      other.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(other.getAttribute('aria-controls') || '');
      if (panel) panel.hidden = !active;
    });
    if (focus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab, false));
    tab.addEventListener('keydown', (event) => {
      const moves: Record<string, number> = {
        ArrowRight: index + 1,
        ArrowDown: index + 1,
        ArrowLeft: index - 1,
        ArrowUp: index - 1,
        Home: 0,
        End: tabs.length - 1
      };
      if (!(event.key in moves)) return;
      event.preventDefault();
      select(tabs[(moves[event.key] + tabs.length) % tabs.length], true);
    });
  });
}

const stopTour = payload ? setupCard(payload) : undefined;
setupFlow(stopTour, setupTelemetry());
setupCvMenus();
setupFilter(payload?.labels.showing ?? '{n} / {n}');
setupTabs();

export {};
