/**
 * Client behaviour for the Swiss poster redesign (/editorial/): method blocks, CV menu,
 * project filter, skill tabs and scroll reveals. No dependencies; without this
 * script every section stays readable (reveals only hide content once JS is on).
 */

interface PosterPayload {
  labels: { showing: string };
}

const payloadNode = document.getElementById('sp-data');
const payload: PosterPayload | null = payloadNode ? JSON.parse(payloadNode.textContent || 'null') : null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const fill = (template: string, ...values: number[]) =>
  values.reduce((text, value) => text.replace('{n}', String(value)), template);

/* ---------------- Method blocks ---------------- */
// Each stage is an accordion header: opening one expands it in place and closes the rest,
// so exactly one is open. Arrow keys, Home and End move focus between stage headers.
function setupMethod() {
  const root = document.querySelector<HTMLElement>('[data-method]');
  if (!root) return;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-stage]')];

  const open = (index: number) => {
    buttons.forEach((button, i) => {
      const active = i === index;
      button.setAttribute('aria-expanded', String(active));
      button.closest('.sp-block')?.classList.toggle('is-open', active);
      const region = document.getElementById(button.getAttribute('aria-controls') || '');
      if (region) region.hidden = !active;
    });
    // Same track list the page renders: the open stage takes the wide track.
    root.style.setProperty(
      '--cols',
      buttons.map((_, i) => (i === index ? 'var(--open-w)' : '1fr')).join(' ')
    );
  };

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => open(index));
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
      buttons[(moves[event.key] + buttons.length) % buttons.length].focus();
    });
  });
}

/* ---------------- Project filter ---------------- */
function setupFilter(showingTemplate: string) {
  const section = document.querySelector<HTMLElement>('[data-projects]');
  if (!section) return;
  const chips = [...section.querySelectorAll<HTMLButtonElement>('[data-tag]')];
  const tiles = [...section.querySelectorAll<HTMLElement>('.sp-tile')];
  const count = section.querySelector<HTMLElement>('[data-count]');
  const clear = section.querySelector<HTMLButtonElement>('[data-clear]');
  const empty = section.querySelector<HTMLElement>('[data-empty]');
  const selected = new Set<string>();
  const grid = section.querySelector<HTMLElement>('.sp-tiles');

  // A lone tile on the last row would leave a hole in the grid; let it span the row instead.
  const layoutLoneTile = () => {
    const visible = tiles.filter((tile) => !tile.hidden);
    tiles.forEach((tile) => tile.classList.remove('is-wide'));
    if (!grid) return;
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
    if (columns > 1 && visible.length % columns === 1) visible[visible.length - 1].classList.add('is-wide');
  };
  window.addEventListener('resize', layoutLoneTile);

  const render = () => {
    let shown = 0;
    tiles.forEach((tile) => {
      const tags: string[] = JSON.parse(tile.dataset.tags || '[]');
      const match = selected.size === 0 || tags.some((tag) => selected.has(tag));
      tile.hidden = !match;
      if (match) shown += 1;
    });
    chips.forEach((chip) => {
      const tag = chip.dataset.tag || '';
      chip.setAttribute('aria-pressed', String(tag === '' ? selected.size === 0 : selected.has(tag)));
    });
    layoutLoneTile();
    if (count) count.textContent = fill(showingTemplate, shown, tiles.length);
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
  clear?.addEventListener('click', () => {
    selected.clear();
    render();
  });
  render();
}

/* ---------------- Skill tabs ---------------- */
function setupTabs() {
  const list = document.querySelector<HTMLElement>('.sp-areas');
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
        ArrowDown: index + 1,
        ArrowRight: index + 1,
        ArrowUp: index - 1,
        ArrowLeft: index - 1,
        Home: 0,
        End: tabs.length - 1
      };
      if (!(event.key in moves)) return;
      event.preventDefault();
      select(tabs[(moves[event.key] + tabs.length) % tabs.length], true);
    });
  });
}

/* ---------------- Scroll reveals ---------------- */
function setupReveals() {
  const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    targets.forEach((target) => target.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
  );
  targets.forEach((target) => observer.observe(target));
  // Anchor jumps and restored scroll positions must never leave a section hidden.
  window.addEventListener('hashchange', () => targets.forEach((target) => target.classList.add('is-in')));
}

setupMethod();
setupFilter(payload?.labels.showing ?? '{n} / {n}');
setupTabs();
setupReveals();

// Module scope: keeps these names from colliding with other client scripts during type checking.
export {};
