/**
 * Client behaviour for the instrument-panel redesign (/v8/): display selector knob,
 * signal-chain modules, sequencer steps, CV and section menus, channel filter,
 * skill banks and power-on reveals. No dependencies; without this script every
 * section stays readable as static content.
 */

interface Stage {
  name: string;
  detail: string;
  tech: string[];
}

interface Mode {
  top: string;
  big: string;
  unit: string;
}

interface Payload {
  stages: Stage[];
  modes: Mode[];
  modeNames: string[];
  labels: { stage: string; showing: string };
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dataNode = document.getElementById('ip-data');
const payload: Payload | null = dataNode ? JSON.parse(dataNode.textContent || 'null') : null;

const fill = (template: string, ...values: number[]) =>
  values.reduce((text, value) => text.replace('{n}', String(value)), template);

/* ---------------- Display selector (rotary knob) ---------------- */
const DETENTS = [-135, -45, 45, 135];

function setupSelector(data: Payload) {
  const knob = document.querySelector<HTMLElement>('[data-knob]');
  const top = document.querySelector<HTMLElement>('[data-lcd-top]');
  const big = document.querySelector<HTMLElement>('[data-lcd-big]');
  const unit = document.querySelector<HTMLElement>('[data-lcd-unit]');
  const live = document.querySelector<HTMLElement>('[data-lcd-live]');
  const lcd = document.querySelector<HTMLElement>('[data-lcd]');
  const detents = [...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  if (!knob || !big) return;

  let current = 0;
  let typing: number | undefined;

  const type = (text: string) => {
    window.clearInterval(typing);
    if (reducedMotion.matches) {
      big.textContent = text;
      return;
    }
    let index = 0;
    big.textContent = '';
    lcd?.classList.add('is-typing');
    typing = window.setInterval(() => {
      index += 1;
      big.textContent = text.slice(0, index);
      if (index >= text.length) {
        window.clearInterval(typing);
        lcd?.classList.remove('is-typing');
      }
    }, 42);
  };

  const select = (index: number, announce: boolean) => {
    const count = data.modes.length;
    current = ((index % count) + count) % count;
    const mode = data.modes[current];
    knob.style.setProperty('--angle', `${DETENTS[current] ?? 0}deg`);
    knob.setAttribute('aria-valuenow', String(current));
    knob.setAttribute('aria-valuetext', data.modeNames[current] || '');
    detents.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.mode) === current)));
    if (top) top.textContent = mode.top;
    if (unit) unit.textContent = mode.unit;
    type(mode.big);
    if (live) {
      // Only announce what the visitor chose, never the first paint.
      live.setAttribute('aria-live', announce ? 'polite' : 'off');
      live.textContent = `${mode.top}: ${mode.big} ${mode.unit}`.trim();
    }
  };

  detents.forEach((button) => button.addEventListener('click', () => select(Number(button.dataset.mode), true)));

  knob.addEventListener('keydown', (event) => {
    const moves: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowUp: current + 1,
      ArrowLeft: current - 1,
      ArrowDown: current - 1,
      Home: 0,
      End: data.modes.length - 1
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const target = moves[event.key];
    if (target < 0 || target >= data.modes.length) return;
    select(target, true);
  });

  // Drag to turn; a click without movement steps to the next detent.
  let dragging = false;
  let moved = false;
  const angleFrom = (event: PointerEvent) => {
    const box = knob.getBoundingClientRect();
    const x = event.clientX - (box.left + box.width / 2);
    const y = event.clientY - (box.top + box.height / 2);
    return (Math.atan2(x, -y) * 180) / Math.PI; // 0° at 12 o'clock, clockwise positive
  };
  const nearest = (angle: number) =>
    DETENTS.reduce((best, detent, index) =>
      Math.abs(detent - angle) < Math.abs(DETENTS[best] - angle) ? index : best, 0);

  knob.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = false;
    knob.setPointerCapture(event.pointerId);
    knob.classList.add('is-grabbed');
  });
  knob.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const index = nearest(angleFrom(event));
    if (index !== current) {
      moved = true;
      select(index, true);
    }
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    knob.classList.remove('is-grabbed');
  };
  knob.addEventListener('pointerup', () => {
    if (dragging && !moved) select(current + 1, true);
    release();
  });
  knob.addEventListener('pointercancel', release);

  select(0, false);
}

/* ---------------- Signal chain + scope ---------------- */
function trace(index: number) {
  const points: string[] = [];
  const cycles = 1.5 + index * 0.75;
  for (let x = 0; x <= 400; x += 4) {
    const phase = (x / 400) * cycles * Math.PI * 2;
    const y = 40 - Math.sin(phase) * (18 + (index % 3) * 4) * (index % 2 ? 1 : Math.cos(phase / 3));
    points.push(`${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`);
  }
  return points.join(' ');
}

function setupChain(data: Payload) {
  const modules = [...document.querySelectorAll<HTMLButtonElement>('[data-stage]')];
  const scope = document.querySelector<HTMLElement>('[data-scope]');
  if (!modules.length || !scope) return;
  const meta = scope.querySelector<HTMLElement>('[data-stage-meta]');
  const name = scope.querySelector<HTMLElement>('[data-stage-name]');
  const detail = scope.querySelector<HTMLElement>('[data-stage-detail]');
  const tech = scope.querySelector<HTMLElement>('[data-stage-tech]');
  const path = scope.querySelector<SVGPathElement>('[data-trace]');

  const show = (index: number, focus: boolean) => {
    const stage = data.stages[index];
    if (!stage) return;
    modules.forEach((module) => module.setAttribute('aria-pressed', String(Number(module.dataset.stage) === index)));
    if (meta) meta.textContent = fill(data.labels.stage, index + 1, data.stages.length);
    if (name) name.textContent = stage.name;
    if (detail) detail.textContent = stage.detail;
    if (tech) tech.textContent = stage.tech.join(' · ');
    if (path) path.setAttribute('d', trace(index));
    scope.classList.remove('is-tuning');
    void scope.offsetWidth; // restart the retune sweep
    scope.classList.add('is-tuning');
    if (focus) modules[index].focus();
  };

  modules.forEach((module, index) => {
    module.addEventListener('click', () => show(index, false));
    module.addEventListener('keydown', (event) => {
      const moves: Record<string, number> = {
        ArrowRight: index + 1,
        ArrowDown: index + 1,
        ArrowLeft: index - 1,
        ArrowUp: index - 1,
        Home: 0,
        End: modules.length - 1
      };
      if (!(event.key in moves)) return;
      event.preventDefault();
      show((moves[event.key] + modules.length) % modules.length, true);
    });
  });
}

/* ---------------- Sequencer steps ---------------- */
function setupSequencer() {
  const steps = [...document.querySelectorAll<HTMLButtonElement>('[data-job]')];
  steps.forEach((step) =>
    step.addEventListener('click', () => {
      const target = document.getElementById(step.dataset.job || '');
      if (!target) return;
      steps.forEach((other) => other.classList.toggle('is-active', other === step));
      if (target instanceof HTMLDetailsElement) target.open = true;
      target.classList.remove('is-cued');
      void target.offsetWidth;
      target.classList.add('is-cued');
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
      const focusable = target instanceof HTMLDetailsElement ? target.querySelector('summary') : target;
      focusable?.focus({ preventScroll: true });
    })
  );
}

/* ---------------- Dropdowns (CV, mobile menu) ---------------- */
function setupDropdowns() {
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
    // Following a section link closes the menu.
    menu.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', () => (menu.open = false)));
  });
}

/* ---------------- Channel filter ---------------- */
function setupFilter(showingTemplate: string) {
  const section = document.querySelector<HTMLElement>('[data-projects]');
  if (!section) return;
  const chips = [...section.querySelectorAll<HTMLButtonElement>('[data-tag]')];
  const items = [...section.querySelectorAll<HTMLElement>('.ip-cart')];
  const count = section.querySelector<HTMLElement>('[data-count]');
  const countNum = section.querySelector<HTMLElement>('[data-count-num]');
  const clear = section.querySelector<HTMLButtonElement>('[data-clear]');
  const empty = section.querySelector<HTMLElement>('[data-empty]');
  const more = section.querySelector<HTMLButtonElement>('[data-more]');
  const channels = section.querySelector<HTMLElement>('.ip-channels');
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
    if (countNum) countNum.textContent = String(shown).padStart(2, '0');
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
  more?.addEventListener('click', () => {
    const expanded = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = (expanded ? more.dataset.labelLess : more.dataset.labelMore) || '';
    channels?.classList.toggle('is-expanded', expanded);
  });
  clear?.addEventListener('click', () => {
    selected.clear();
    render();
  });
  render();
}

/* ---------------- Skill banks (tabs) ---------------- */
function setupBanks() {
  const list = document.querySelector<HTMLElement>('.ip-banks');
  if (!list) return;
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

  const select = (tab: HTMLButtonElement, focus: boolean) => {
    tabs.forEach((other) => {
      const active = other === tab;
      other.setAttribute('aria-selected', String(active));
      other.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(other.getAttribute('aria-controls') || '');
      if (panel) {
        panel.hidden = !active;
        if (active) {
          panel.classList.remove('is-sweeping');
          void panel.offsetWidth;
          panel.classList.add('is-sweeping');
        }
      }
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

/* ---------------- Power-on reveals + offscreen pause ---------------- */
function setupReveal() {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    sections.forEach((section) => section.classList.add('is-on'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-on');
        observer.unobserve(entry.target);
      }),
    { rootMargin: '0px 0px -12% 0px' }
  );
  sections.forEach((section) => observer.observe(section));

  // Looping meters and cable pulses stop while their panel is off screen.
  const loops = [...document.querySelectorAll<HTMLElement>('[data-device], [data-chain], [data-seq]')];
  const idle = new IntersectionObserver((entries) =>
    entries.forEach((entry) => entry.target.classList.toggle('is-idle', !entry.isIntersecting))
  );
  loops.forEach((loop) => idle.observe(loop));
}

if (payload) {
  setupSelector(payload);
  setupChain(payload);
}
setupSequencer();
setupDropdowns();
setupFilter(payload?.labels.showing ?? '{n} / {n}');
setupBanks();
setupReveal();

export {};
