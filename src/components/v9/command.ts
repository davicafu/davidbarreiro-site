/**
 * Client behaviour for the Dev theme (/ and /es/): the inline and ⌘K palettes,
 * the scripted demo, the help dialog, the pipeline inspector, the CV menu, the release list, the project
 * filter and the skill tabs. No dependencies; without this script every palette option is
 * still a plain link and every section is readable.
 */

interface Stage {
  name: string;
  detail: string;
  tech: string[];
}

interface Payload {
  stages: Stage[];
  labels: {
    stage: string;
    showing: string;
    results: string;
    source: string;
    sink: string;
    copied: string;
    copyFailed: string;
  };
  demo: string[];
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const payloadNode = document.getElementById('cp-data');
const data: Payload | null = payloadNode ? JSON.parse(payloadNode.textContent || 'null') : null;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const fill = (template: string, ...values: (string | number)[]) =>
  values.reduce<string>((text, value) => text.replace('{n}', String(value)), template);

/* ---------------- Shared helpers ---------------- */
const toast = document.querySelector<HTMLElement>('[data-toast]');
let toastTimer: number | undefined;
function showToast(message: string) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(data?.labels.copied ?? value);
  } catch {
    showToast(data?.labels.copyFailed ?? value);
  }
}

function reveal(target: HTMLElement) {
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
}

let selectSkill: ((index: number) => void) | undefined;
let openPalette: (() => void) | undefined;
let openHelp: (() => void) | undefined;

/** Runs a palette option that is not a plain link. Returns true when it handled the option. */
function runAction(option: HTMLElement): boolean {
  const action = option.dataset.action;
  const value = option.dataset.value || '';
  if (action === 'help') {
    openHelp?.();
    return true;
  }
  if (action === 'copy') {
    void copyText(value);
    return true;
  }
  if (action === 'skill') {
    selectSkill?.(Number(value));
    const section = document.getElementById('skills');
    if (section) reveal(section);
    document.getElementById(`skill-tab-${value}`)?.focus({ preventScroll: true });
    return true;
  }
  if (action === 'job') {
    const item = document.getElementById(`job-${value}`);
    const details = item?.querySelector('details');
    if (details) details.open = true;
    if (item) reveal(item);
    item?.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
    return true;
  }
  return false;
}

/* ---------------- Palette ---------------- */
interface PaletteApi {
  root: HTMLElement;
  input: HTMLInputElement;
  filter: (query: string, announce: boolean) => void;
}

function setupPalette(root: HTMLElement, onDone: () => void, onEscape: () => void): PaletteApi | null {
  const input = root.querySelector<HTMLInputElement>('[data-input]');
  const list = root.querySelector<HTMLElement>('[data-list]');
  if (!input || !list) return null;
  const options = [...root.querySelectorAll<HTMLElement>('[data-option]')];
  const groups = [...root.querySelectorAll<HTMLElement>('[data-group]')];
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const emptyQuery = root.querySelector<HTMLElement>('[data-empty-query]');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const live = root.querySelector<HTMLElement>('[data-live]');
  let visible: HTMLElement[] = options;
  let active = -1;

  const setActive = (index: number, scroll: boolean) => {
    options.forEach((option) => option.setAttribute('aria-selected', 'false'));
    active = visible.length ? (index + visible.length) % visible.length : -1;
    const current = visible[active];
    if (!current) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    current.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', current.id);
    if (scroll) {
      // Keep the active option inside the list without scrolling the page.
      const top = current.offsetTop - list.offsetTop;
      const bottom = top + current.offsetHeight;
      const header = 30;
      if (top - header < list.scrollTop) list.scrollTop = Math.max(0, top - header);
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6;
    }
  };

  const filter = (query: string, announce: boolean) => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    visible = [];
    options.forEach((option) => {
      const text = option.dataset.search || '';
      const match = tokens.every((token) => text.includes(token));
      option.hidden = !match;
      if (match) visible.push(option);
    });
    groups.forEach((group) => {
      group.hidden = !group.querySelector('[data-option]:not([hidden])');
    });
    if (empty) empty.hidden = visible.length > 0;
    if (emptyQuery) emptyQuery.textContent = query.trim();
    const message = fill(data?.labels.results ?? '{n}', visible.length);
    if (count) count.textContent = message;
    if (live) {
      live.setAttribute('aria-live', announce ? 'polite' : 'off');
      live.textContent = announce ? message : '';
    }
    list.scrollTop = 0;
    setActive(tokens.length ? 0 : -1, false);
  };

  const activate = (option: HTMLElement | undefined) => {
    if (!option) return;
    option.click();
  };

  input.addEventListener('input', () => {
    // A lone "?" opens the help instead of searching for it.
    if (input.value.trim() === '?' && openHelp) {
      input.value = '';
      filter('', false);
      openHelp();
      return;
    }
    filter(input.value, true);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(active + 1, true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(active < 0 ? visible.length - 1 : active - 1, true);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activate(visible[active < 0 ? 0 : active]);
    } else if (event.key === 'Escape') {
      if (input.value) {
        event.preventDefault();
        event.stopPropagation();
        input.value = '';
        filter('', true);
      } else {
        onEscape();
      }
    }
  });

  options.forEach((option) => {
    option.addEventListener('mousemove', () => {
      const index = visible.indexOf(option);
      if (index !== active) setActive(index, false);
    });
    option.addEventListener('click', (event) => {
      if (runAction(option)) event.preventDefault();
      onDone();
    });
  });

  filter('', false);
  return { root, input, filter };
}

/* ---------------- Modal palette (⌘K, Ctrl+K, "/") ---------------- */
function setupDialog() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-dialog]');
  const root = dialog?.querySelector<HTMLElement>('[data-palette]');
  if (!dialog || !root || typeof dialog.showModal !== 'function') return;

  const close = () => {
    if (dialog.open) dialog.close();
  };
  const palette = setupPalette(root, close, close);
  if (!palette) return;

  const open = () => {
    if (dialog.open) return;
    const help = document.querySelector<HTMLDialogElement>('[data-help]');
    if (help?.open) help.close();
    palette.input.value = '';
    palette.filter('', false);
    dialog.showModal();
    palette.input.focus();
  };

  openPalette = open;
  document.querySelectorAll<HTMLElement>('[data-open-palette]').forEach((button) =>
    button.addEventListener('click', open)
  );
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    const typing =
      !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) close();
      else open();
    } else if (event.key === '/' && !typing && !dialog.open && !document.querySelector('[data-help][open]')) {
      event.preventDefault();
      open();
    }
  });
}

/* ---------------- Help dialog ("?" in a palette, the Help command, the footer hint) ---------------- */
function setupHelp() {
  const help = document.querySelector<HTMLDialogElement>('[data-help]');
  if (!help || typeof help.showModal !== 'function') return;
  const palette = document.querySelector<HTMLDialogElement>('[data-dialog]');
  const closeButton = help.querySelector<HTMLElement>('[data-help-close]');
  // Where Esc returns to: the ⌘K palette when the help was opened from it, else the opener.
  let backToPalette = false;
  let returnTo: HTMLElement | null = null;

  openHelp = () => {
    if (help.open) return;
    backToPalette = Boolean(palette?.open);
    returnTo = backToPalette ? null : (document.activeElement as HTMLElement | null);
    if (palette?.open) palette.close();
    help.showModal();
    closeButton?.focus();
  };

  closeButton?.addEventListener('click', () => help.close());
  help.addEventListener('click', (event) => {
    if (event.target === help) help.close();
  });
  help.addEventListener('close', () => {
    if (backToPalette) openPalette?.();
    else if (!palette?.open) returnTo?.focus({ preventScroll: true });
    backToPalette = false;
    returnTo = null;
  });
  document.querySelectorAll<HTMLElement>('[data-open-help]').forEach((button) =>
    button.addEventListener('click', () => openHelp?.())
  );
}

/* ---------------- Inline hero palette with a scripted demo ---------------- */
function setupHeroPalette() {
  const root = document.querySelector<HTMLElement>('[data-palette="inline"]');
  if (!root) return;
  const palette = setupPalette(
    root,
    () => undefined,
    () => palette?.input.blur()
  );
  if (!palette || !data) return;
  const { input, filter } = palette;

  let stopped = reducedMotion.matches;
  let paused = false;
  let timer: number | undefined;
  let typedByDemo = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    root.classList.remove('is-demo');
    if (typedByDemo) {
      input.value = '';
      filter('', false);
    }
    typedByDemo = false;
  };

  // Type each query, hold it, erase it; two passes, then leave the palette empty.
  const steps: { value: string; wait: number }[] = [];
  for (let pass = 0; pass < 2; pass += 1) {
    data.demo.forEach((word) => {
      for (let i = 1; i <= word.length; i += 1) steps.push({ value: word.slice(0, i), wait: 110 });
      steps.push({ value: word, wait: 1700 });
      for (let i = word.length - 1; i >= 0; i -= 1) steps.push({ value: word.slice(0, i), wait: 45 });
      steps.push({ value: '', wait: 420 });
    });
  }
  let step = 0;
  const tick = () => {
    if (stopped) return;
    if (paused) {
      timer = window.setTimeout(tick, 400);
      return;
    }
    const current = steps[step];
    if (!current) {
      stopped = true;
      root.classList.remove('is-demo');
      typedByDemo = false;
      return;
    }
    input.value = current.value;
    typedByDemo = current.value !== '';
    filter(current.value, false);
    step += 1;
    timer = window.setTimeout(tick, current.wait);
  };

  ['pointerdown', 'keydown', 'focusin', 'wheel', 'touchstart'].forEach((type) =>
    root.addEventListener(type, stop, { passive: true })
  );

  if (!stopped) {
    root.classList.add('is-demo');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        paused = !entry.isIntersecting;
      }).observe(root);
    }
    document.addEventListener('visibilitychange', () => {
      paused = document.hidden;
    });
    timer = window.setTimeout(tick, 900);
  }
}

/* ---------------- Shortcut labels ---------------- */
function setupShortcutLabels() {
  if (isMac) return;
  document.querySelectorAll<HTMLElement>('[data-shortcut]').forEach((node) => {
    node.textContent = 'Ctrl K';
  });
}

/* ---------------- Pipeline inspector ---------------- */
function setupPipeline(payload: Payload) {
  const graph = document.querySelector<HTMLElement>('[data-graph]');
  const panel = document.querySelector<HTMLElement>('[data-inspector]');
  const run = document.querySelector<HTMLElement>('[data-run]');
  if (!graph || !panel) return;
  const tabs = [...graph.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const step = panel.querySelector<HTMLElement>('[data-inspector-step]');
  const name = panel.querySelector<HTMLElement>('[data-inspector-name]');
  const detail = panel.querySelector<HTMLElement>('[data-inspector-detail]');
  const tech = panel.querySelector<HTMLElement>('[data-inspector-tech]');
  const input = panel.querySelector<HTMLElement>('[data-inspector-in]');
  const output = panel.querySelector<HTMLElement>('[data-inspector-out]');
  const total = payload.stages.length;

  const select = (index: number, focus: boolean) => {
    const stage = payload.stages[index];
    if (!stage) return;
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('is-upstream', i < index);
    });
    panel.setAttribute('aria-labelledby', tabs[index].id);
    panel.classList.remove('is-swapping');
    void panel.offsetWidth; // restart the swap animation
    panel.classList.add('is-swapping');
    if (step) step.textContent = fill(payload.labels.stage, index + 1, total);
    if (name) name.textContent = stage.name;
    if (detail) detail.textContent = stage.detail;
    if (tech) {
      tech.replaceChildren(
        ...stage.tech.map((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          return li;
        })
      );
    }
    if (input) input.textContent = payload.stages[index - 1]?.name ?? payload.labels.source;
    if (output) output.textContent = payload.stages[index + 1]?.name ?? payload.labels.sink;
    if (focus) tabs[index].focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
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
      select((moves[event.key] + tabs.length) % tabs.length, true);
    });
  });

  // The run lights up its stages once, the first time it scrolls into view.
  if (run) {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      run.classList.add('is-done');
    } else {
      run.classList.add('is-pending');
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          run.classList.remove('is-pending');
          run.classList.add('is-running');
          window.setTimeout(() => run.classList.add('is-done'), 260 * total + 300);
        },
        { threshold: 0.35 }
      );
      observer.observe(run);
    }
  }
}


/* ---------------- Copy buttons ---------------- */
function setupCopyButtons() {
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) =>
    button.addEventListener('click', () => void copyText(button.dataset.copy || ''))
  );
}

/* ---------------- Project filter ---------------- */
function setupFilter(showingTemplate: string) {
  const section = document.querySelector<HTMLElement>('[data-projects]');
  if (!section) return;
  const chips = [...section.querySelectorAll<HTMLButtonElement>('[data-tag]')];
  const items = [...section.querySelectorAll<HTMLElement>('.cp-repos > li')];
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
    if (count) count.textContent = fill(showingTemplate, shown, items.length);
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
    section.querySelector('.cp-filter')?.classList.toggle('is-expanded', expanded);
  });
  clear?.addEventListener('click', () => {
    selected.clear();
    render();
  });
  render();
}

/* ---------------- Skill tabs ---------------- */
function setupTabs() {
  const list = document.querySelector<HTMLElement>('[data-tabs]');
  if (!list) return;
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

  const select = (index: number, focus: boolean) => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls') || '');
      if (panel) panel.hidden = !active;
    });
    if (focus) tabs[index]?.focus();
  };
  selectSkill = (index: number) => select(index, false);

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
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
      select((moves[event.key] + tabs.length) % tabs.length, true);
    });
  });
}

/* ---------------- Section reveal ---------------- */
function setupReveal() {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    sections.forEach((section) => section.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }),
    { rootMargin: '0px 0px -8% 0px' }
  );
  sections.forEach((section) => observer.observe(section));
}

/* ---------------- Hero glow follows the pointer ---------------- */
function setupGlow() {
  const hero = document.querySelector<HTMLElement>('.cp-hero');
  if (!hero || reducedMotion.matches) return;
  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    hero.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
  });
}

setupShortcutLabels();
setupTabs();
setupHeroPalette();
setupDialog();
setupHelp();
if (data) setupPipeline(data);
setupCopyButtons();
setupFilter(data?.labels.showing ?? '{n} / {n}');
setupReveal();
setupGlow();

export {};
