function setVisualUnavailable(node, reason) {
  if (!node) return;
  node.innerHTML = `<div class="rounded-xl border border-amber-400/40 bg-amber-300/10 p-4 text-sm text-amber-100">Visualization unavailable: ${reason}</div>`;
}

function scheduleIdle(callback, timeout = 1200) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  }
  return window.setTimeout(callback, 240);
}

function afterLoad(callback) {
  if (document.readyState === 'complete') {
    callback();
    return;
  }

  window.addEventListener('load', callback, { once: true });
}

async function scheduleVisualHydration(tasks = [], options = {}) {
  const safeTasks = tasks.filter((task) => typeof task?.mount === 'function' && typeof task?.id === 'string');
  const taskById = new Map(safeTasks.map((task) => [task.id, task]));
  const mountedTasks = new Set();
  const refreshers = new Map();
  const rootMargin = options.rootMargin || '380px 0px';

  const runTask = async (task) => {
    if (mountedTasks.has(task.id)) return;
    mountedTasks.add(task.id);
    try {
      const mountResult = await task.mount();
      if (typeof mountResult?.refresh === 'function') {
        refreshers.set(task.id, () => {
          const node = document.getElementById(task.id);
          if (!node?.isConnected) return;
          mountResult.refresh();
        });
      }
    } catch {
      mountedTasks.delete(task.id);
      const node = document.getElementById(task.id);
      setVisualUnavailable(node, 'this visualization failed to initialize.');
    }
  };

  const runHydration = async () => {
    if (!('IntersectionObserver' in window)) {
      for (const task of safeTasks) {
        await runTask(task);
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const task = taskById.get(entry.target.id);
          if (!task) return;
          runTask(task);
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin, threshold: 0.01 }
    );

    safeTasks.forEach((task) => {
      const node = document.getElementById(task.id);
      if (!node) return;
      observer.observe(node);
    });
  };

  afterLoad(() => {
    scheduleIdle(() => {
      runHydration();
    });
  });

  return {
    refreshMounted() {
      refreshers.forEach((refresh) => refresh());
    }
  };
}

export { scheduleVisualHydration };
