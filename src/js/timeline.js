import { appState, CURRENT_YEAR, palette, reducedMotion } from './state.js';
import { safeText } from './utils.js';
import { t } from './i18n.js';
import { showTip, hideTip } from './ui.js';
import { min, max, color, scaleLinear, axisBottom, format, select } from './vendor/d3-lite.js';
function timeline() {
  const el = document.getElementById('timeline');
  if (typeof el.__timelineCleanup === 'function') {
    el.__timelineCleanup();
    el.__timelineCleanup = null;
  }
  el.innerHTML = '';
  const w = el.clientWidth || 980;
  const isMobile = w < 820;
  const isNarrowMobile = w < 560;
  const minYear = Math.floor(min(appState.jobs, (d) => d.start) || 2015);
  const maxYear = Math.ceil(max(appState.jobs, (d) => d.end) || CURRENT_YEAR);
  const trackY = 56;
  const cardsTopOffset = 76;
  const cardW = isMobile ? Math.min(w - 28, 440) : 320;
  const cardH = 178;
  const rowGap = 30;
  const cardXMin = 14;
  const cardXMax = w - cardW - 14;
  const rowMinGap = 14;
  const x = scaleLinear()
    .domain([minYear, maxYear])
    .range([30, w - 30]);

  const clampCardX = (cx) => Math.max(cardXMin, Math.min(cardXMax, cx - cardW / 2));
  const placedRows = [];
  let placed = appState.jobs
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((job) => {
      const cx = x((job.start + job.end) / 2);
      const left = clampCardX(cx);
      const right = left + cardW;
      let row = 0;
      while (placedRows[row] !== undefined && placedRows[row] + rowMinGap > left) row += 1;
      placedRows[row] = right;
      return { ...job, row, cx, left, right };
    });

  function extractTech(text) {
    const known = [
      'Kafka',
      'Spark',
      'Flink',
      'ClickHouse',
      'Elastic',
      'Grafana',
      'DBT',
      'Airflow',
      'Go',
      'Java',
      'Docker',
      'Kubernetes',
      'Python',
      'Scala'
    ];
    const hits = known.filter((t) => text.toLowerCase().includes(t.toLowerCase()));
    return hits.slice(0, 4);
  }

  if (isMobile) {
    const mobileLeft = (w - cardW) / 2;
    let cursorY = trackY + cardsTopOffset;
    placed = placed.map((item, idx) => {
      const withLayout = {
        ...item,
        row: idx,
        left: mobileLeft,
        cx: x((item.start + item.end) / 2),
        cardTop: cursorY,
        cardHeight: 210,
        renderedCardHeight: 210
      };
      cursorY += withLayout.cardHeight + 22;
      return withLayout;
    });
  }

  placed = placed.map((item, index) => ({
    ...item,
    color: palette[index % palette.length]
  }));

  const pointColor = (node) => node.color;
  const pointBorderColor = (node, alpha = 0.9) => {
    const c = color(pointColor(node));
    if (!c) return pointColor(node);
    c.opacity = alpha;
    return c.formatRgb();
  };

  const getDetailItems = (d) => {
    if (d.type === 'education') {
      const techItems = Array.isArray(d.tech) ? d.tech.filter(Boolean) : [];
      return techItems.length ? techItems : [t(appState.locale, 'no_tech_provided', 'No tech provided.')];
    }
    const highlights = Array.isArray(d.highlights) ? d.highlights.filter(Boolean) : [];
    return highlights.length
      ? highlights
      : [t(appState.locale, 'no_highlights_provided', 'No highlights provided.')];
  };

  const beautifyDetailText = (value) => {
    const txt = safeText(value, '');
    if (!txt) return '';
    const normalized = txt.replace(/\s+/g, ' ').trim();
    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  };

  const getChips = (d) => (Array.isArray(d.tech) && d.tech.length ? d.tech : extractTech(d.text)).slice(0, 5);

  if (isMobile) {
    const formatPeriod = (d) =>
      `${Math.floor(d.start)} - ${Math.floor(d.end) >= CURRENT_YEAR ? t(appState.locale, 'timeline_present', 'Present') : Math.floor(d.end)}`;
    const mobileItems = placed.slice();
    const neutralBorder = 'rgba(148,163,184,.32)';
    const list = document.createElement('div');
    const fragment = document.createDocumentFragment();
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '14px';

    const nodes = [];
    let activeIndex = -1;
    const detailTransitionMs = 300;

    const setDetailClosedStyles = (detail) => {
      detail.style.maxHeight = '0px';
      detail.style.opacity = '0';
      detail.style.transform = 'translateY(-6px)';
      detail.style.marginTop = '0px';
      detail.style.paddingTop = '0px';
      detail.style.paddingBottom = '0px';
      detail.style.borderWidth = '0px';
      detail.style.borderColor = 'transparent';
    };

    const setDetailOpenShellStyles = (detail, borderColor) => {
      detail.style.display = 'block';
      detail.style.paddingTop = '16px';
      detail.style.paddingBottom = '16px';
      detail.style.borderWidth = '1px';
      detail.style.borderColor = borderColor;
    };

    const setDetailCollapsedFrameStyles = (detail) => {
      detail.style.maxHeight = '0px';
      detail.style.opacity = '0';
      detail.style.transform = 'translateY(-6px)';
      detail.style.marginTop = '0px';
    };

    const setDetailExpandedStyles = (detail, height) => {
      detail.style.maxHeight = `${height}px`;
      detail.style.opacity = '1';
      detail.style.transform = 'translateY(0)';
      detail.style.marginTop = '6px';
    };

    const getMeasuredDetailHeight = (detail) => {
      if (detail.__measuredHeight) return detail.__measuredHeight;
      detail.__measuredHeight = Math.ceil(detail.scrollHeight) + 6;
      return detail.__measuredHeight;
    };

    const forceTransitionLayout = (detail) => {
      // Keep one isolated layout read so Safari reliably transitions from the collapsed state.
      void detail.offsetHeight;
    };

    const closeAt = (index) => {
      if (index < 0 || index >= nodes.length) return;
      const current = nodes[index];
      const measuredHeight =
        current.detail.__measuredHeight ||
        Math.ceil(current.detail.scrollHeight || current.detail.getBoundingClientRect().height || 0);
      current.card.style.borderStyle = 'dashed';
      current.card.style.borderColor = neutralBorder;
      if (current.detail.__collapseRaf) {
        cancelAnimationFrame(current.detail.__collapseRaf);
        current.detail.__collapseRaf = null;
      }
      if (current.detail.__closeTimer) {
        clearTimeout(current.detail.__closeTimer);
        current.detail.__closeTimer = null;
      }
      if (reducedMotion) {
        current.detail.style.maxHeight = '0px';
        current.detail.style.opacity = '0';
        current.detail.style.transform = 'translateY(-6px)';
        current.detail.style.marginTop = '0px';
        current.detail.style.paddingTop = '0px';
        current.detail.style.paddingBottom = '0px';
        current.detail.style.borderWidth = '0px';
        current.detail.style.borderColor = 'transparent';
        current.detail.style.display = 'none';
      } else {
        setDetailOpenShellStyles(current.detail, current.borderColor);
        setDetailExpandedStyles(current.detail, Math.max(0, measuredHeight));
        forceTransitionLayout(current.detail);
        current.detail.__collapseRaf = requestAnimationFrame(() => {
          current.detail.__collapseRaf = null;
          setDetailClosedStyles(current.detail);
        });
        current.detail.__closeTimer = setTimeout(() => {
          current.detail.style.display = 'none';
          current.detail.__closeTimer = null;
        }, detailTransitionMs + 24);
      }
      activeIndex = -1;
    };

    const scrollDetailIntoView = (detailNode) => {
      const rect = detailNode.getBoundingClientRect();
      const topMargin = 96;
      const bottomMargin = 40;
      if (rect.bottom > window.innerHeight - bottomMargin) {
        const delta = rect.bottom - (window.innerHeight - bottomMargin);
        if (Math.abs(delta) > 8)
          window.scrollBy({ top: delta + 6, behavior: reducedMotion ? 'auto' : 'smooth' });
      } else if (rect.top < topMargin) {
        const delta = rect.top - topMargin;
        if (Math.abs(delta) > 8)
          window.scrollBy({ top: delta - 6, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    };

    const openAt = (index) => {
      if (index < 0 || index >= nodes.length) return;
      if (activeIndex >= 0 && activeIndex !== index) closeAt(activeIndex);
      const current = nodes[index];
      current.card.style.borderStyle = 'solid';
      current.card.style.borderColor = current.activeBorderColor;
      if (current.detail.__closeTimer) {
        clearTimeout(current.detail.__closeTimer);
        current.detail.__closeTimer = null;
      }
      setDetailOpenShellStyles(current.detail, current.borderColor);
      const targetHeight = getMeasuredDetailHeight(current.detail);
      setDetailCollapsedFrameStyles(current.detail);
      forceTransitionLayout(current.detail);
      setDetailExpandedStyles(current.detail, targetHeight);
      current.card.classList.remove('sweep-mobile');
      requestAnimationFrame(() => current.card.classList.add('sweep-mobile'));
      if (current.card.__sweepTimer) clearTimeout(current.card.__sweepTimer);
      current.card.__sweepTimer = setTimeout(() => current.card.classList.remove('sweep-mobile'), 620);
      activeIndex = index;
      setTimeout(() => scrollDetailIntoView(current.detail), reducedMotion ? 0 : 200);
    };

    mobileItems.forEach((d, i) => {
      const item = document.createElement('div');
      item.className = 'timeline-mobile-item';

      const card = document.createElement('div');
      const isEducation = d.type === 'education';
      const chips = getChips(d);
      const cardStyle = isEducation
        ? 'background: linear-gradient(135deg, rgba(14,116,144,.46) 0%, rgba(8,47,73,.52) 45%, rgba(15,23,42,.84) 100%);'
        : 'background: linear-gradient(135deg, rgba(15,23,42,.88) 0%, rgba(30,41,59,.72) 52%, rgba(15,23,42,.9) 100%);';
      card.className = `timeline-card ${isEducation ? 'timeline-card-edu' : ''} rounded-2xl border p-4 text-slate-200`;
      card.style.borderStyle = 'dashed';
      card.style.borderColor = neutralBorder;
      card.style.borderWidth = '1px';
      card.style.boxShadow = '0 14px 34px rgba(2,6,23,.45)';
      card.style.cssText += cardStyle;
      card.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <p class="font-black text-white text-sm">${safeText(d.company, '')}</p>
          <span class="text-xs text-slate-400">${formatPeriod(d)}</span>
        </div>
        <div class="mt-2 flex items-center gap-2">
          <span style="width:10px;height:10px;border-radius:999px;background:${pointColor(d)};display:inline-block;"></span>
          <p class="text-sm text-cyan-200">${safeText(d.role, '')}</p>
        </div>
        <p class="text-xs text-slate-400 mt-2 leading-relaxed">${safeText(d.text, '')}</p>
        <div class="mt-3">
          ${chips.map((chip) => `<span class="timeline-tech-chip" style="display:inline-block; margin:0 .55rem .55rem 0; padding:.44rem .84rem;">${chip}</span>`).join('')}
        </div>
      `;

      const detail = document.createElement('div');
      detail.className =
        'mt-1 rounded-2xl border bg-slate-950/98 p-4 text-xs text-slate-200 shadow-[0_14px_34px_rgba(8,47,73,.45)]';
      detail.style.display = 'none';
      detail.style.borderStyle = 'dashed';
      detail.style.overflow = 'hidden';
      setDetailClosedStyles(detail);
      detail.style.transition = reducedMotion
        ? 'none'
        : `max-height ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), margin-top ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), padding-top ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), padding-bottom ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), border-width ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), border-color .22s ease`;
      detail.innerHTML = `
        <p class="mb-2 text-cyan-300 font-bold">${d.type === 'education' ? t(appState.locale, 'timeline_label_tech', 'Tech') : t(appState.locale, 'timeline_label_highlights', 'Highlights')}</p>
        <ul class="space-y-2 text-slate-300 leading-relaxed">
          ${getDetailItems(d)
            .map(
              (itemText) =>
                `<li class="flex items-start gap-2"><span class="text-cyan-300 mt-[1px]">•</span><span>${beautifyDetailText(itemText)}</span></li>`
            )
            .join('')}
        </ul>
      `;

      card.addEventListener('click', (event) => {
        event.stopPropagation();
        if (activeIndex === i) {
          closeAt(i);
          return;
        }
        openAt(i);
      });

      item.appendChild(card);
      item.appendChild(detail);
      fragment.appendChild(item);
      nodes.push({
        data: d,
        card,
        detail,
        borderColor: pointBorderColor(d, 0.84),
        activeBorderColor: pointBorderColor(d, 0.92)
      });
    });

    list.appendChild(fragment);
    el.appendChild(list);

    const onDocumentClick = (event) => {
      if (!el.contains(event.target) && activeIndex >= 0) closeAt(activeIndex);
    };
    document.addEventListener('click', onDocumentClick);
    el.__timelineCleanup = () => {
      document.removeEventListener('click', onDocumentClick);
      nodes.forEach(({ card, detail }) => {
        if (card && card.__sweepTimer) {
          clearTimeout(card.__sweepTimer);
          card.__sweepTimer = null;
        }
        if (detail && detail.__collapseRaf) {
          cancelAnimationFrame(detail.__collapseRaf);
          detail.__collapseRaf = null;
        }
        if (detail && detail.__closeTimer) {
          clearTimeout(detail.__closeTimer);
          detail.__closeTimer = null;
        }
      });
    };

    const timelineTipHtml = t(
      appState.locale,
      'timeline_tip_mobile',
      '<span class="text-cyan-300 font-bold">Tip:</span> tap a work card to expand highlights, or an education card to expand tech. Tap outside to close.'
    );
    const timelineTipTarget = document.getElementById('timeline-tip');
    if (timelineTipTarget) {
      timelineTipTarget.className =
        'section-tip-contrast mb-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300';
      timelineTipTarget.innerHTML = timelineTipHtml;
    } else {
      const timelineTip = document.createElement('div');
      timelineTip.className =
        'section-tip-contrast mt-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300';
      timelineTip.innerHTML = timelineTipHtml;
      el.appendChild(timelineTip);
    }
    return;
  }

  const totalRows = max(placed, (d) => d.row) + 1;
  const h = trackY + cardsTopOffset + totalRows * (cardH + rowGap) + 84;
  const getCardTop = (d) => trackY + cardsTopOffset + d.row * (cardH + rowGap);

  el.style.position = 'relative';

  const svg = select(el)
    .append('svg')
    .attr('viewBox', [0, 0, w, h])
    .attr('width', '100%')
    .attr('height', h)
    .style('display', 'block');

  svg
    .append('line')
    .attr('x1', x(minYear))
    .attr('x2', x(maxYear))
    .attr('y1', trackY)
    .attr('y2', trackY)
    .attr('stroke', 'rgba(103,232,249,.45)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '6 8');

  svg
    .append('g')
    .attr('transform', `translate(0,${trackY + 18})`)
    .call(
      axisBottom(x)
        .tickFormat(format('d'))
        .ticks(isNarrowMobile ? 4 : Math.min(9, Math.max(4, maxYear - minYear + 1)))
    )
    .call((g) => g.selectAll('text').attr('fill', '#94a3b8').attr('font-size', 11))
    .call((g) => g.selectAll('path,line').attr('stroke', 'rgba(148,163,184,.22)'));

  const nodes = svg
    .selectAll('.timeline-node')
    .data(placed)
    .join('g')
    .attr('class', 'timeline-node')
    .attr('transform', (d) => `translate(${d.cx},${trackY})`);

  nodes
    .append('circle')
    .attr('r', 0)
    .attr('fill', (d, i) => palette[i % palette.length])
    .attr('stroke', 'rgba(255,255,255,.45)')
    .attr('stroke-width', 1.2)
    .style('cursor', 'pointer')
    .transition()
    .duration(reducedMotion ? 0 : 500)
    .delay((d, i) => i * 90)
    .attr('r', 6);

  nodes
    .append('line')
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', 8)
    .attr('y2', (d) => getCardTop(d) - trackY - 2)
    .attr('stroke', 'rgba(103,232,249,.62)')
    .attr('stroke-width', 2)
    .attr('stroke-linecap', 'round')
    .attr('stroke-dasharray', '5 7')
    .attr('opacity', 0)
    .transition()
    .duration(reducedMotion ? 0 : 520)
    .delay((d, i) => 120 + i * 80)
    .attr('opacity', 0.95);

  const overlay = document.createElement('div');
  overlay.className = 'timeline-overlay';
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.height = `${h}px`;
  el.appendChild(overlay);

  const cards = placed.map((d, i) => {
    const period = `${Math.floor(d.start)} - ${Math.floor(d.end) >= CURRENT_YEAR ? t(appState.locale, 'timeline_present', 'Present') : Math.floor(d.end)}`;
    const chips = getChips(d);
    const isEducation = d.type === 'education';
    const shellStyle = isEducation
      ? 'background: linear-gradient(135deg, rgba(14,116,144,.46) 0%, rgba(8,47,73,.52) 45%, rgba(15,23,42,.84) 100%);'
      : 'background: linear-gradient(135deg, rgba(15,23,42,.88) 0%, rgba(30,41,59,.72) 52%, rgba(15,23,42,.9) 100%);';
    const card = document.createElement('div');
    card.className = `timeline-card ${isEducation ? 'timeline-card-edu' : ''} rounded-2xl border border-slate-800 p-4 text-slate-200`;
    card.style.cssText = `
      position:absolute;
      left:${d.left}px;
      top:${getCardTop(d)}px;
      width:${cardW}px;
      min-height:${cardH}px;
      box-shadow:0 14px 34px rgba(2,6,23,.45);
      pointer-events:auto;
      ${shellStyle}
    `;
    card.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <p class="font-black text-white text-sm">${d.company}</p>
        <span class="text-xs text-slate-400">${period}</span>
      </div>
      <p class="text-sm text-cyan-200 mt-1">${d.role}</p>
      <p class="text-xs text-slate-400 mt-2 leading-relaxed">${d.text}</p>
      <div class="mt-3">
        ${chips.map((chip) => `<span class="timeline-tech-chip" style="display:inline-block; margin:0 .55rem .55rem 0; padding:.44rem .84rem;">${chip}</span>`).join('')}
      </div>
    `;
    card.style.opacity = '0';
    card.style.transform = 'translateY(14px)';
    card.style.transition = reducedMotion
      ? 'none'
      : 'opacity .45s ease, transform .45s ease, box-shadow .2s ease, border-color .2s ease, filter .2s ease';
    setTimeout(
      () => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      },
      reducedMotion ? 0 : 160 + i * 90
    );

    overlay.appendChild(card);
    return { data: d, card };
  });

  let desktopActiveNode = null;
  const applyDesktopFocus = (selected = null) => {
    const hasSelected = !!selected;
    cards.forEach(({ data, card }) => {
      const isActive = selected === data;
      card.style.opacity = !hasSelected || isActive ? '1' : '0.42';
      card.style.filter = !hasSelected || isActive ? 'none' : 'saturate(.75)';
      card.style.boxShadow =
        !hasSelected || isActive ? '0 16px 38px rgba(8,47,73,.45)' : '0 8px 18px rgba(2,6,23,.26)';
      card.style.borderStyle = !hasSelected ? 'solid' : isActive ? 'solid' : 'dashed';
      card.style.borderColor = !hasSelected
        ? 'rgba(148,163,184,.22)'
        : isActive
          ? pointBorderColor(data, 0.92)
          : 'rgba(148,163,184,.22)';
    });
    nodes
      .select('line')
      .transition()
      .duration(220)
      .attr('opacity', (d) => (!hasSelected ? 0.95 : d === selected ? 0.95 : 0.18));
    nodes
      .select('circle')
      .transition()
      .duration(220)
      .attr('opacity', (d) => (!hasSelected ? 1 : d === selected ? 1 : 0.45))
      .attr('stroke-width', (d) => (!hasSelected ? 1.2 : d === selected ? 1.9 : 1.1));
  };

  cards.forEach(({ data, card }) => {
    card.addEventListener('mousemove', (event) => {
      const isEducation = data.type === 'education';
      const detailItems = (
        isEducation
          ? Array.isArray(data.tech)
            ? data.tech.filter(Boolean)
            : []
          : Array.isArray(data.highlights)
            ? data.highlights.filter(Boolean)
            : []
      ).slice(0, 5);
      const detailLabel = isEducation ? 'Tech' : 'Highlights';
      const detailsHtml = detailItems.length
        ? `<p class="mt-2 text-slate-300"><small><strong>${detailLabel}:</strong><br>${detailItems.map((item) => `• ${item}`).join('<br>')}</small></p>`
        : '';
      const kind =
        data.type === 'education'
          ? t(appState.locale, 'timeline_kind_education', 'Education')
          : t(appState.locale, 'timeline_kind_work', 'Work');
      showTip(
        event,
        `<strong>${data.company}</strong><br><small>${kind} · ${data.role}</small>${detailsHtml}`,
        true
      );
    });
    card.addEventListener('mouseleave', () => hideTip());
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      desktopActiveNode = desktopActiveNode === data ? null : data;
      applyDesktopFocus(desktopActiveNode);
    });
  });

  nodes.style('cursor', 'pointer').on('click', (event, d) => {
    event.stopPropagation();
    desktopActiveNode = desktopActiveNode === d ? null : d;
    applyDesktopFocus(desktopActiveNode);
  });

  const onReset = () => {
    desktopActiveNode = null;
    applyDesktopFocus(null);
    hideTip();
  };
  svg.on('click', onReset);
  overlay.addEventListener('click', onReset);

  el.__timelineCleanup = () => {
    overlay.removeEventListener('click', onReset);
  };

  const timelineTipHtml = isMobile
    ? t(
        appState.locale,
        'timeline_tip_mobile',
        '<span class="text-cyan-300 font-bold">Tip:</span> tap a work card to expand highlights, or an education card to expand tech. Tap outside to close.'
      )
    : t(
        appState.locale,
        'timeline_tip_desktop',
        '<span class="text-cyan-300 font-bold">Tip:</span> hover cards to inspect details, or click a card/point to focus and dim the rest. Click outside to reset.'
      );
  const timelineTipTarget = document.getElementById('timeline-tip');
  if (timelineTipTarget) {
    timelineTipTarget.className =
      'section-tip-contrast mb-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300';
    timelineTipTarget.innerHTML = timelineTipHtml;
  } else {
    const timelineTip = document.createElement('div');
    timelineTip.className =
      'section-tip-contrast mt-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300';
    timelineTip.innerHTML = timelineTipHtml;
    el.appendChild(timelineTip);
  }
}

export { timeline };
