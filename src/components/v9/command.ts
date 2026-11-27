/**
 * Client behaviour for the Dev theme (/ and /es/): the inline and ⌘K palettes,
 * the scripted demo, the help dialog, the pipeline run and inspector, the release list, the project
 * filter, the skill tabs and the status bar. No dependencies; without this script every palette option is
 * still a plain link and every section is readable.
 */

interface Stage {
  name: string;
  detail: string;
  tech: string[];
}

type RunState = 'queued' | 'running' | 'done';

interface Payload {
  stages: Stage[];
  run: {
    ms: number[];
    log: { kind: string; text: string }[][];
    state: Record<RunState, string>;
    status: Record<RunState, string>;
  };
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
// The head script sets data-os before first paint; this fallback only covers its absence.
const isMac = document.documentElement.dataset.os
  ? document.documentElement.dataset.os === 'mac'
  : /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
/** Lowercase without accents, so "ingles" finds "inglés". */
const fold = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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
let openPalette: ((query?: string) => void) | undefined;
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

  // Ranking data: the option's own label weighs more than its meta, keywords and group.
  const entries = new Map(
    options.map((option, index) => [
      option,
      {
        index,
        label: fold(option.querySelector('.cp-option-label')?.textContent || ''),
        words: fold(option.dataset.search || '').split(/[^\p{L}\p{N}?#+]+/u).filter(Boolean),
        text: fold(option.dataset.search || '')
      }
    ])
  );
  const scoreToken = (option: HTMLElement, token: string) => {
    const entry = entries.get(option);
    if (!entry) return 0;
    if (entry.label === token) return 100;
    if (entry.label.startsWith(token)) return 80;
    if (entry.label.split(/[^\p{L}\p{N}?#+]+/u).some((word) => word.startsWith(token))) return 60;
    if (entry.words.some((word) => word.startsWith(token))) return 40;
    return entry.text.includes(token) ? 20 : 0;
  };
  /** Every token must match; exact and prefix matches on the label rank first. */
  const score = (option: HTMLElement, tokens: string[]) => {
    let total = 0;
    for (const token of tokens) {
      const value = scoreToken(option, token);
      if (!value) return 0;
      total += value;
    }
    return total;
  };
  const byRank = (scores: Map<HTMLElement, number>) => (a: HTMLElement, b: HTMLElement) =>
    (scores.get(b) ?? 0) - (scores.get(a) ?? 0) || (entries.get(a)?.index ?? 0) - (entries.get(b)?.index ?? 0);

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
    const tokens = fold(query.trim()).split(/\s+/).filter(Boolean);
    const scores = new Map<HTMLElement, number>();
    options.forEach((option) => {
      const value = tokens.length ? score(option, tokens) : 1;
      scores.set(option, value);
      option.hidden = value === 0;
    });
    // Reorder: best group first, best option first inside each group. No query restores
    // the original order, because every score is then equal.
    const best = (group: HTMLElement) =>
      Math.max(0, ...[...group.querySelectorAll<HTMLElement>('[data-option]')].map((o) => scores.get(o) ?? 0));
    const firstIndex = (group: HTMLElement) => groups.indexOf(group);
    [...groups]
      .sort((a, b) => best(b) - best(a) || firstIndex(a) - firstIndex(b))
      .forEach((group) => {
        const groupOptions = [...group.querySelectorAll<HTMLElement>('[data-option]')].sort(byRank(scores));
        groupOptions.forEach((option) => group.append(option));
        group.hidden = groupOptions.every((option) => option.hidden);
        list.insertBefore(group, empty && empty.parentElement === list ? empty : null);
      });
    visible = [...list.querySelectorAll<HTMLElement>('[data-option]:not([hidden])')];
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

  const focusInput = () => {
    palette.input.focus({ preventScroll: true });
    // The modal input also has `autofocus`; re-check on the next frame so focus ends there.
    requestAnimationFrame(() => {
      if (dialog.open && document.activeElement !== palette.input) palette.input.focus({ preventScroll: true });
    });
  };
  const open = (query = '') => {
    if (dialog.open) {
      focusInput();
      return;
    }
    const help = document.querySelector<HTMLDialogElement>('[data-help]');
    if (help?.open) help.close();
    palette.input.value = query;
    palette.filter(query, Boolean(query));
    dialog.showModal();
    focusInput();
  };

  // On phones the palette and help are full-screen sheets. The on-screen keyboard overlays the
  // page (iOS never resizes the layout viewport) and may scroll it, so size and place both sheets
  // to the visible part of the screen: the input stays on top, the footer right above the keyboard.
  const viewport = window.visualViewport;
  if (viewport) {
    const fit = () => {
      const html = document.documentElement.style;
      html.setProperty('--cp-vv-height', `${Math.round(viewport.height)}px`);
      html.setProperty('--cp-vv-top', `${Math.round(viewport.offsetTop)}px`);
    };
    fit();
    viewport.addEventListener('resize', fit);
    viewport.addEventListener('scroll', fit);
  }

  openPalette = open;
  document.querySelectorAll<HTMLElement>('[data-open-palette]').forEach((button) =>
    button.addEventListener('click', () => open())
  );
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
  // Phones have no Esc key and the full-screen sheet leaves no backdrop to tap.
  root.querySelector('[data-close]')?.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    const typing =
      !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    // ⌘K and Ctrl+K both work on every OS. event.code keeps it working on non-Latin layouts.
    const isK = event.key.toLowerCase() === 'k' || event.code === 'KeyK';
    if ((event.metaKey || event.ctrlKey) && !event.altKey && isK) {
      event.preventDefault();
      // Holding the keys auto-repeats keydown; toggling on each repeat closed the palette
      // again and sent the typing back to the page, so only the first press counts.
      if (event.repeat) return;
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
  // "Try" examples: close the help and run the query in the ⌘K palette.
  help.querySelectorAll<HTMLElement>('[data-try]').forEach((button) =>
    button.addEventListener('click', () => {
      backToPalette = false;
      returnTo = null;
      help.close();
      openPalette?.(button.dataset.try || '');
    })
  );
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

  // On phones the keyboard would cover the inline results, so typing happens in the full-screen sheet.
  const phone = window.matchMedia('(max-width: 720px)');
  input.addEventListener('focus', () => {
    if (!phone.matches || !openPalette) return;
    input.blur();
    openPalette(input.value);
  });

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
  // Both labels are rendered and CSS shows the right one before paint; keep only that one.
  document.querySelectorAll<HTMLElement>('[data-shortcut]').forEach((node) => {
    node.textContent = isMac ? '⌘K' : 'Ctrl K';
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

  if (run) setupRun(payload, run, tabs);
}

/* ---------------- Pipeline run: a CI-style log, stage by stage ---------------- */
function setupRun(payload: Payload, run: HTMLElement, nodes: HTMLElement[]) {
  const status = run.querySelector<HTMLElement>('[data-run-status]');
  const count = run.querySelector<HTMLElement>('[data-run-count]');
  const time = run.querySelector<HTMLElement>('[data-run-time]');
  const lines = run.querySelector<HTMLElement>('[data-console]');
  const rerun = run.querySelector<HTMLButtonElement>('[data-rerun]');
  const { ms, log, state, status: statusText } = payload.run;
  const total = nodes.length;
  // Without JS, or with reduced motion, the markup already shows the finished run.
  if (reducedMotion.matches || !('IntersectionObserver' in window) || !lines) return;

  let timers: number[] = [];
  let clock: number | undefined;
  let done = 0;
  const later = (fn: () => void, delay: number) => {
    timers.push(window.setTimeout(fn, delay));
  };
  const setRun = (value: RunState | 'pending') => {
    run.classList.toggle('is-pending', value === 'pending' || value === 'queued');
    run.classList.toggle('is-running', value === 'running');
    run.classList.toggle('is-done', value === 'done');
  };
  const setNode = (index: number, value: RunState) => {
    const node = nodes[index];
    if (!node) return;
    node.dataset.state = value;
    const label = node.querySelector<HTMLElement>('[data-node-state]');
    if (label) label.textContent = state[value];
  };
  const print = (line: { kind: string; text: string }) => {
    const item = document.createElement('li');
    item.className = `is-${line.kind} is-new`;
    item.textContent = line.text;
    lines.append(item);
    // Follow the output inside the console only; the page does not scroll.
    lines.scrollTop = lines.scrollHeight;
  };

  const reset = () => {
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
    window.clearInterval(clock);
    done = 0;
    nodes.forEach((_, index) => setNode(index, 'queued'));
    lines.replaceChildren();
    if (count) count.textContent = `0/${total}`;
    if (time) time.textContent = '0.0s';
    if (status) status.textContent = statusText.queued;
    setRun('queued');
  };

  const start = () => {
    reset();
    setRun('running');
    if (status) status.textContent = statusText.running;
    const began = performance.now();
    clock = window.setInterval(() => {
      if (time) time.textContent = `${((performance.now() - began) / 1000).toFixed(1)}s`;
    }, 100);
    let at = 250;
    ms.forEach((duration, index) => {
      const stageLines = log[index] || [];
      later(() => {
        setNode(index, 'running');
        if (stageLines[0]) print(stageLines[0]);
      }, at);
      // Body lines stream in while the stage runs; the last line closes it.
      stageLines.slice(1, -1).forEach((line, n) => later(() => print(line), at + ((n + 1) * duration) / stageLines.length));
      later(() => {
        const last = stageLines[stageLines.length - 1];
        if (last && stageLines.length > 1) print(last);
        setNode(index, 'done');
        done += 1;
        if (count) count.textContent = `${done}/${total}`;
      }, at + duration);
      at += duration + 120;
    });
    later(() => {
      window.clearInterval(clock);
      const seconds = ms.reduce((sum, value) => sum + value, 0) / 1000;
      if (time) time.textContent = `${seconds.toFixed(1)}s`;
      if (status) status.textContent = statusText.done;
      setRun('done');
    }, at);
  };

  reset();
  setRun('pending');
  if (rerun) {
    rerun.hidden = false;
    rerun.addEventListener('click', start);
  }
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      start();
    },
    { threshold: 0.3 }
  );
  observer.observe(run);
}

/* ---------------- Status bar: current section and scroll position ---------------- */
function setupStatusBar() {
  const path = document.querySelector<HTMLElement>('[data-sb-path]');
  const pos = document.querySelector<HTMLElement>('[data-sb-pos]');
  if (!path || !pos) return;
  const sections = [...document.querySelectorAll<HTMLElement>('main section[id]')];
  let frame = 0;
  const update = () => {
    frame = 0;
    const line = window.innerHeight * 0.35;
    let current = '';
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= line) current = section.id;
    });
    path.textContent = current ? `~/${current}` : '~';
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    pos.textContent = ratio <= 0.01 ? 'Top' : ratio >= 0.99 ? 'Bot' : `${Math.round(ratio * 100)}%`;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();
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
setupStatusBar();

export {};
