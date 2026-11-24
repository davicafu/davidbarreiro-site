/**
 * Client behaviour for the data-notebook redesign (/v10/): cells that run as they
 * scroll into view (and on demand), the method DAG, expandable result rows, the live
 * WHERE clause of the project filter, skill tabs and the CV/outline menus. No
 * dependencies; without this script every output is already rendered and readable.
 */

interface Stage {
  name: string;
  detail: string;
  tech: string[];
}

interface Payload {
  stages: Stage[];
  labels: { stage: string; showing: string; running: string; all: string };
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dataNode = document.getElementById('nb-data');
const payload: Payload | null = dataNode ? JSON.parse(dataNode.textContent || 'null') : null;
const fill = (template: string, ...values: (string | number)[]) =>
  values.reduce<string>((text, value) => text.replace('{n}', String(value)), template);

/* ---------------- Kernel + cell execution ---------------- */
function setupCells(runningLabel: string) {
  const cells = [...document.querySelectorAll<HTMLElement>('[data-cell]')];
  const kernel = document.querySelector<HTMLElement>('[data-kernel]');
  const kernelText = kernel?.querySelector<HTMLElement>('[data-kernel-text]');
  let busy = 0;
  let executionCount = 0;

  const setKernel = () => {
    kernel?.classList.toggle('is-busy', busy > 0);
    if (kernelText && kernel) kernelText.textContent = (busy > 0 ? kernel.dataset.busy : kernel.dataset.idle) || '';
  };

  const countUp = (cell: HTMLElement) => {
    cell.querySelectorAll<HTMLElement>('[data-count-to]').forEach((node) => {
      const target = Number(node.dataset.countTo);
      if (reducedMotion.matches || !Number.isFinite(target)) {
        node.textContent = String(target);
        return;
      }
      const started = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - started) / 700);
        node.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  const run = (cell: HTMLElement) => {
    if (cell.dataset.state === 'running') return;
    const label = cell.querySelector<HTMLElement>('[data-in]');
    const meta = cell.querySelector<HTMLElement>('[data-meta]');
    cell.dataset.state = 'running';
    cell.classList.remove('is-done');
    if (label) label.textContent = '[*]';
    if (meta) meta.textContent = runningLabel;
    busy += 1;
    setKernel();
    const delay = reducedMotion.matches ? 0 : 380 + Math.round(Math.random() * 260);
    window.setTimeout(() => {
      executionCount += 1;
      cell.dataset.state = 'done';
      void cell.offsetWidth; // restart the output's entry animation on re-runs
      cell.classList.add('is-done');
      if (label) label.textContent = `[${executionCount}]`;
      if (meta) meta.textContent = cell.dataset.ran || '';
      busy -= 1;
      setKernel();
      countUp(cell);
    }, delay);
  };

  cells.forEach((cell) => {
    cell.dataset.state = 'idle';
    cell.querySelector<HTMLButtonElement>('[data-rerun]')?.addEventListener('click', () => run(cell));
  });

  if (!('IntersectionObserver' in window)) {
    cells.forEach(run);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        run(entry.target as HTMLElement);
      }),
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  cells.forEach((cell) => observer.observe(cell));
}

/* ---------------- Method DAG ---------------- */
function setupDag(data: Payload) {
  const nodes = [...document.querySelectorAll<HTMLButtonElement>('[data-node]')];
  const detail = document.querySelector<HTMLElement>('[data-node-detail]');
  if (!nodes.length || !detail) return;
  const meta = detail.querySelector<HTMLElement>('[data-node-meta]');
  const name = detail.querySelector<HTMLElement>('[data-node-name]');
  const text = detail.querySelector<HTMLElement>('[data-node-text]');
  const tech = detail.querySelector<HTMLElement>('[data-node-tech]');

  const select = (index: number, focus: boolean) => {
    const stage = data.stages[index];
    if (!stage) return;
    nodes.forEach((node, i) => {
      node.classList.toggle('is-active', i === index);
      node.setAttribute('aria-pressed', String(i === index));
    });
    if (meta) meta.textContent = fill(data.labels.stage, index + 1, data.stages.length);
    if (name) name.textContent = stage.name;
    if (text) text.textContent = stage.detail;
    if (tech) {
      tech.replaceChildren(
        ...stage.tech.map((item) => {
          const code = document.createElement('code');
          code.textContent = item;
          return code;
        })
      );
    }
    detail.classList.remove('is-swapping');
    void detail.offsetWidth;
    detail.classList.add('is-swapping');
    if (focus) nodes[index].focus();
  };

  nodes.forEach((node, index) => {
    node.addEventListener('click', () => {
      // Announce only what the visitor chose.
      detail.setAttribute('aria-live', 'polite');
      select(index, false);
    });
    node.addEventListener('keydown', (event) => {
      const moves: Record<string, number> = {
        ArrowRight: index + 1,
        ArrowDown: index + 1,
        ArrowLeft: index - 1,
        ArrowUp: index - 1,
        Home: 0,
        End: nodes.length - 1
      };
      if (!(event.key in moves)) return;
      event.preventDefault();
      detail.setAttribute('aria-live', 'polite');
      select((moves[event.key] + nodes.length) % nodes.length, true);
    });
  });
}

/* ---------------- Expandable result rows ---------------- */
function setupRows() {
  document.querySelectorAll<HTMLButtonElement>('[data-row-toggle]').forEach((button) => {
    const target = document.getElementById(button.getAttribute('aria-controls') || '');
    if (!target) return;
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      target.hidden = !open;
    });
  });
}

/* ---------------- Projects: live WHERE clause ---------------- */
function setupFilter(data: Payload) {
  const section = document.querySelector<HTMLElement>('[data-projects]');
  if (!section) return;
  const chips = [...section.querySelectorAll<HTMLButtonElement>('[data-tag]')];
  const items = [...section.querySelectorAll<HTMLElement>('.nb-projects > li')];
  const count = section.querySelector<HTMLElement>('[data-count]');
  const clear = section.querySelector<HTMLButtonElement>('[data-clear]');
  const empty = section.querySelector<HTMLElement>('[data-empty]');
  const where = section.querySelector<HTMLElement>('[data-where]');
  const selected: string[] = [];

  const span = (className: string, value: string) => {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = value;
    return node;
  };

  const renderWhere = () => {
    if (!where) return;
    if (selected.length === 0) {
      where.replaceChildren(span('c', `-- WHERE topics: ${data.labels.all}`));
      return;
    }
    const parts: Node[] = [span('k', 'WHERE'), document.createTextNode(' topics && ARRAY[')];
    selected.forEach((tag, index) => {
      const chip = chips.find((item) => item.dataset.tag === tag);
      parts.push(span('s is-new', chip?.dataset.sql || `'${tag}'`));
      if (index < selected.length - 1) parts.push(document.createTextNode(', '));
    });
    parts.push(document.createTextNode(']'));
    where.replaceChildren(...parts);
  };

  const render = () => {
    let shown = 0;
    items.forEach((item) => {
      const tags: string[] = JSON.parse(item.dataset.tags || '[]');
      const match = selected.length === 0 || tags.some((tag) => selected.includes(tag));
      item.hidden = !match;
      if (match) shown += 1;
    });
    chips.forEach((chip) => {
      const tag = chip.dataset.tag || '';
      chip.setAttribute('aria-pressed', String(tag === '' ? selected.length === 0 : selected.includes(tag)));
    });
    if (count) count.textContent = fill(data.labels.showing, shown, items.length);
    if (clear) clear.hidden = selected.length === 0;
    if (empty) empty.hidden = shown > 0;
    renderWhere();
  };

  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag || '';
      if (tag === '') selected.length = 0;
      else if (selected.includes(tag)) selected.splice(selected.indexOf(tag), 1);
      else selected.push(tag);
      render();
    })
  );
  const more = section.querySelector<HTMLButtonElement>('[data-more]');
  more?.addEventListener('click', () => {
    const expanded = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = (expanded ? more.dataset.labelLess : more.dataset.labelMore) || '';
    section.querySelector('[data-chips]')?.classList.toggle('is-expanded', expanded);
  });
  clear?.addEventListener('click', () => {
    selected.length = 0;
    render();
  });
  render();
}

/* ---------------- Skill tabs ---------------- */
function setupTabs() {
  const list = document.querySelector<HTMLElement>('[data-tabs]');
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

/* ---------------- CV and outline menus ---------------- */
function setupMenus() {
  document.querySelectorAll<HTMLDetailsElement>('[data-cv], [data-menu]').forEach((menu) => {
    document.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary')?.focus();
      }
    });
    // Following a link inside the outline closes it.
    menu.querySelectorAll('nav a').forEach((link) => link.addEventListener('click', () => (menu.open = false)));
  });
}

if (payload) {
  setupCells(payload.labels.running);
  setupDag(payload);
  setupFilter(payload);
}
setupRows();
setupTabs();
setupMenus();

export {};
