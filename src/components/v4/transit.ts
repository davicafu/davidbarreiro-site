/**
 * Client behaviour for the transit redesign (/v4/): station board, train pause,
 * CV menu, project filter and skill-zone tabs. No dependencies; every feature
 * degrades to readable static content when this script does not run.
 */

interface StopInfo {
  name: string;
  detail: string;
  tech: string[];
}

interface StopsPayload {
  data: StopInfo[];
  work: StopInfo[];
  edu: StopInfo[];
  labels: { station: string; workStop: string; eduStop: string; total: number; showing: string };
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const payloadNode = document.getElementById('tn-stops');
const payload: StopsPayload | null = payloadNode ? JSON.parse(payloadNode.textContent || 'null') : null;

/* ---------------- Station board ---------------- */
function setupBoard(data: StopsPayload) {
  const board = document.querySelector<HTMLElement>('[data-board]');
  if (!board) return;
  const meta = board.querySelector<HTMLElement>('[data-board-meta]');
  const name = board.querySelector<HTMLElement>('[data-board-name]');
  const detail = board.querySelector<HTMLElement>('[data-board-detail]');
  const tech = board.querySelector<HTMLElement>('[data-board-tech]');
  const stops = [...document.querySelectorAll<HTMLElement | SVGElement>('[data-stop]')];

  let autoTimer: number | undefined;
  let autoIndex = 0;

  const show = (key: string) => {
    const [line, rawIndex] = key.split('-');
    const index = Number(rawIndex);
    const info = line === 'work' ? data.work[index] : line === 'edu' ? data.edu[index] : data.data[index];
    if (!info) return;
    board.classList.remove('is-flipping');
    void board.offsetWidth; // restart the flip animation
    board.classList.add('is-flipping');
    if (meta) {
      meta.textContent =
        line === 'work'
          ? data.labels.workStop
          : line === 'edu'
            ? data.labels.eduStop
            : data.labels.station.replace('{n}', String(index + 1)).replace('{n}', String(data.labels.total));
    }
    if (name) name.textContent = info.name;
    if (detail) detail.textContent = info.detail;
    if (tech) tech.textContent = info.tech.join(' · ');
    stops.forEach((stop) => stop.classList.toggle('is-active', stop.dataset.stop === key));
    stops
      .filter((stop) => stop instanceof HTMLButtonElement)
      .forEach((stop) => stop.setAttribute('aria-pressed', String(stop.dataset.stop === key)));
  };

  const stopAuto = () => {
    window.clearInterval(autoTimer);
    autoTimer = undefined;
  };

  stops.forEach((stop) => {
    const key = stop.dataset.stop;
    if (!key) return;
    const choose = () => {
      stopAuto();
      // Announce only what the visitor chose, never the automatic tour.
      board.setAttribute('aria-live', 'polite');
      show(key);
    };
    stop.addEventListener('click', choose);
    stop.addEventListener('pointerenter', (event) => {
      if ((event as PointerEvent).pointerType === 'mouse') choose();
    });
    if (!(stop instanceof HTMLButtonElement)) {
      stop.addEventListener('keydown', (event) => {
        const { key: pressed } = event as KeyboardEvent;
        if (pressed === 'Enter' || pressed === ' ') {
          event.preventDefault();
          choose();
        }
      });
    }
  });

  show('data-0');

  // A short guided tour through the data line until the visitor takes over.
  if (!reducedMotion.matches) {
    autoTimer = window.setInterval(() => {
      autoIndex = (autoIndex + 1) % data.data.length;
      show(`data-${autoIndex}`);
    }, 3800);
  }
  return stopAuto;
}

/* ---------------- Trains (SMIL) ---------------- */
function setupTrains(stopTour: (() => void) | undefined) {
  const map = document.querySelector<SVGSVGElement>('[data-map]');
  const button = document.querySelector<HTMLButtonElement>('[data-pause]');
  if (!map || !button) return;
  const text = button.querySelector<HTMLElement>('[data-pause-text]');
  let userPaused = reducedMotion.matches;
  let visible = true;

  const apply = () => {
    const running = !userPaused && visible;
    if (running) map.unpauseAnimations();
    else map.pauseAnimations();
    button.setAttribute('aria-pressed', String(userPaused));
    if (text)
      text.textContent = userPaused ? button.dataset.labelResume || '' : button.dataset.labelPause || '';
    map.classList.toggle('is-paused', userPaused);
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
    }).observe(map);
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
  const items = [...section.querySelectorAll<HTMLElement>('.tn-projects > li')];
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
    if (count)
      count.textContent = showingTemplate.replace('{n}', String(shown)).replace('{n}', String(items.length));
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
    section.querySelector('.tn-filter')?.classList.toggle('is-expanded', expanded);
  });
  clear?.addEventListener('click', () => {
    selected.clear();
    render();
  });
  render();
}

/* ---------------- Skill zones (tabs) ---------------- */
function setupTabs() {
  const list = document.querySelector<HTMLElement>('.tn-zones');
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

const stopTour = payload ? setupBoard(payload) : undefined;
setupTrains(stopTour);
setupCvMenus();
setupFilter(payload?.labels.showing ?? '{n} / {n}');
setupTabs();

export {};
