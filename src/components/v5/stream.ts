/**
 * Client behaviour for the event-stream redesign (/v5/): event log replay, pipeline
 * stage selector, CV menu, project filter and skill partitions. No dependencies;
 * without this script every section stays readable as static content.
 */

interface Stage {
  name: string;
  detail: string;
  tech: string[];
}

interface Payload {
  stages: Stage[];
  labels: { stage: string; showing: string; pause: string; resume: string; replay: string };
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dataNode = document.getElementById('es-data');
const payload: Payload | null = dataNode ? JSON.parse(dataNode.textContent || 'null') : null;
const fill = (template: string, ...values: number[]) =>
  values.reduce((text, value) => text.replace('{n}', String(value)), template);

/* ---------------- Event log replay ---------------- */
function setupStream(labels: Payload['labels']) {
  const stream = document.querySelector<HTMLElement>('[data-stream]');
  const button = stream?.querySelector<HTMLButtonElement>('[data-stream-toggle]');
  const label = stream?.querySelector<HTMLElement>('[data-stream-label]');
  if (!stream || !button || !label) return;
  const rows = [...stream.querySelectorAll<HTMLElement>('.es-log > li')];
  // Under reduced motion the full log stays visible and nothing replays.
  if (reducedMotion.matches || rows.length === 0) return;

  button.hidden = false;
  // Start with the first few events on screen so the console never opens empty.
  const initial = Math.min(4, rows.length);
  let shown = initial;
  let timer: number | undefined;
  let userPaused = false;
  let visible = true;

  const render = () => {
    rows.forEach((row, index) => {
      row.classList.toggle('is-pending', index >= shown);
      row.classList.toggle('is-new', index === shown - 1);
    });
    stream.classList.toggle('is-done', shown >= rows.length);
  };

  const updateButton = () => {
    const done = shown >= rows.length;
    label.textContent = done ? labels.replay : userPaused ? labels.resume : labels.pause;
    button.setAttribute('aria-pressed', String(userPaused && !done));
  };

  const tick = () => {
    if (shown >= rows.length) {
      stop();
      updateButton();
      return;
    }
    shown += 1;
    render();
  };

  function stop() {
    window.clearInterval(timer);
    timer = undefined;
  }

  const sync = () => {
    const shouldRun = visible && !userPaused && shown < rows.length;
    if (shouldRun && timer === undefined) timer = window.setInterval(tick, 850);
    if (!shouldRun) stop();
    updateButton();
  };

  button.addEventListener('click', () => {
    if (shown >= rows.length) {
      shown = initial;
      userPaused = false;
      render();
    } else {
      userPaused = !userPaused;
    }
    sync();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      stream.classList.toggle('is-offscreen', !visible);
      sync();
    }).observe(stream);
  }

  render();
  sync();
}

/* ---------------- Pipeline stages ---------------- */
function setupPipeline(data: Payload) {
  const section = document.querySelector<HTMLElement>('[data-pipeline]');
  if (!section) return;
  const buttons = [...section.querySelectorAll<HTMLButtonElement>('[data-stage]')];
  const meta = section.querySelector<HTMLElement>('[data-stage-meta]');
  const title = section.querySelector<HTMLElement>('[data-stage-title]');
  const detail = section.querySelector<HTMLElement>('[data-stage-detail]');
  const tech = section.querySelector<HTMLElement>('[data-stage-tech]');
  const panel = section.querySelector<HTMLElement>('[data-stage-panel]');

  const select = (index: number) => {
    const stage = data.stages[index];
    if (!stage) return;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    section.style.setProperty('--progress', String(index / Math.max(1, data.stages.length - 1)));
    if (meta) meta.textContent = fill(data.labels.stage, index + 1, data.stages.length);
    if (title) title.textContent = stage.name;
    if (detail) detail.textContent = stage.detail;
    if (tech) {
      tech.replaceChildren(
        ...stage.tech.map((name) => {
          const item = document.createElement('li');
          item.textContent = name;
          return item;
        })
      );
    }
    panel?.classList.remove('is-swapping');
    void panel?.offsetWidth; // restart the swap animation
    panel?.classList.add('is-swapping');
  };

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', (event) => {
      const moves: Record<string, number> = {
        ArrowRight: index + 1,
        ArrowDown: index + 1,
        ArrowLeft: index - 1,
        ArrowUp: index - 1,
        Home: 0,
        End: buttons.length - 1
      };
      if (!(event.key in moves)) return;
      event.preventDefault();
      const next = (moves[event.key] + buttons.length) % buttons.length;
      buttons[next].focus();
      select(next);
    });
  });

  const wire = section.querySelector<HTMLElement>('.es-wire');
  if (wire && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) =>
      wire.classList.toggle('is-offscreen', !entry.isIntersecting)
    ).observe(wire);
  }
  select(0);
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
function setupFilter(showing: string) {
  const section = document.querySelector<HTMLElement>('[data-projects]');
  if (!section) return;
  const chips = [...section.querySelectorAll<HTMLButtonElement>('[data-tag]')];
  const items = [...section.querySelectorAll<HTMLElement>('.es-topics > li')];
  const count = section.querySelector<HTMLElement>('[data-count]');
  const clear = section.querySelector<HTMLButtonElement>('[data-clear]');
  const empty = section.querySelector<HTMLElement>('[data-empty]');
  const selected = new Set<string>();

  const render = () => {
    let visible = 0;
    items.forEach((item) => {
      const tags: string[] = JSON.parse(item.dataset.tags || '[]');
      const match = selected.size === 0 || tags.some((tag) => selected.has(tag));
      item.hidden = !match;
      if (match) visible += 1;
    });
    chips.forEach((chip) => {
      const tag = chip.dataset.tag || '';
      chip.setAttribute('aria-pressed', String(tag === '' ? selected.size === 0 : selected.has(tag)));
    });
    if (count) count.textContent = fill(showing, visible, items.length);
    if (clear) clear.hidden = selected.size === 0;
    if (empty) empty.hidden = visible > 0;
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
  clear?.addEventListener('click', () => {
    selected.clear();
    render();
  });
  render();
}

/* ---------------- Skill partitions (tabs) ---------------- */
function setupTabs() {
  const list = document.querySelector<HTMLElement>('.es-partitions');
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

if (payload) {
  setupStream(payload.labels);
  setupPipeline(payload);
}
setupCvMenus();
setupFilter(payload?.labels.showing ?? '{n} / {n}');
setupTabs();

// Module scope: keeps these names from colliding with other non-module client scripts in type checking.
export {};
