import { appState, CURRENT_YEAR, palette, reducedMotion } from './state.js';
import { safeText } from './utils.js';
import { showTip, hideTip } from './ui.js';
function timeline(){
  const el = document.getElementById("timeline");
  if (typeof el.__timelineCleanup === "function") {
    el.__timelineCleanup();
    el.__timelineCleanup = null;
  }
  el.innerHTML = "";
  const w = el.clientWidth || 980;
  const isMobile = w < 820;
  const isNarrowMobile = w < 560;
  const minYear = Math.floor(d3.min(appState.jobs, d => d.start) || 2015);
  const maxYear = Math.ceil(d3.max(appState.jobs, d => d.end) || CURRENT_YEAR);
  const trackY = 56;
  const cardsTopOffset = 76;
  const cardW = isMobile ? Math.min(w - 28, 440) : 320;
  const cardH = 178;
  const rowGap = 30;
  const cardXMin = 14;
  const cardXMax = w - cardW - 14;
  const rowMinGap = 14;
  const x = d3.scaleLinear().domain([minYear, maxYear]).range([30, w - 30]);

  const clampCardX = cx => Math.max(cardXMin, Math.min(cardXMax, cx - cardW / 2));
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
    const known = ["Kafka", "Spark", "Flink", "ClickHouse", "Elastic", "Grafana", "DBT", "Airflow", "Go", "Java", "Docker", "Kubernetes", "Python", "Scala"];
    const hits = known.filter(t => text.toLowerCase().includes(t.toLowerCase()));
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

  const pointColor = node => palette[Math.max(0, placed.indexOf(node)) % palette.length];
  const pointBorderColor = (node, alpha = 0.9) => {
    const c = d3.color(pointColor(node));
    if (!c) return pointColor(node);
    c.opacity = alpha;
    return c.formatRgb();
  };

  if (isMobile) {
    const formatPeriod = d => `${Math.floor(d.start)} - ${Math.floor(d.end) >= CURRENT_YEAR ? "Present" : Math.floor(d.end)}`;
    const mobileItems = placed.slice();
    const neutralBorder = "rgba(148,163,184,.32)";
    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "14px";
    el.appendChild(list);

    const getDetailItems = d => {
      if (d.type === "education") {
        const techItems = Array.isArray(d.tech) ? d.tech.filter(Boolean) : [];
        return techItems.length ? techItems : ["No tech provided."];
      }
      const highlights = Array.isArray(d.highlights) ? d.highlights.filter(Boolean) : [];
      return highlights.length ? highlights : ["No highlights provided."];
    };

    const beautify = value => {
      const txt = safeText(value, "");
      if (!txt) return "";
      const normalized = txt.replace(/\s+/g, " ").trim();
      return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
    };

    const nodes = [];
    let activeIndex = -1;
    const detailTransitionMs = 300;

    const closeAt = index => {
      if (index < 0 || index >= nodes.length) return;
      const current = nodes[index];
      current.card.style.borderStyle = "dashed";
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
        current.detail.style.maxHeight = "0px";
        current.detail.style.opacity = "0";
        current.detail.style.transform = "translateY(-6px)";
        current.detail.style.marginTop = "0px";
        current.detail.style.paddingTop = "0px";
        current.detail.style.paddingBottom = "0px";
        current.detail.style.borderWidth = "0px";
        current.detail.style.borderColor = "transparent";
        current.detail.style.display = "none";
      } else {
        const currentHeight = Math.ceil(current.detail.scrollHeight || current.detail.getBoundingClientRect().height || 0);
        current.detail.style.display = "block";
        current.detail.style.maxHeight = `${Math.max(0, currentHeight)}px`;
        current.detail.style.opacity = "1";
        current.detail.style.transform = "translateY(0)";
        current.detail.style.marginTop = "6px";
        current.detail.style.paddingTop = "16px";
        current.detail.style.paddingBottom = "16px";
        current.detail.style.borderWidth = "1px";
        current.detail.style.borderColor = pointBorderColor(current.data, 0.84);
        void current.detail.offsetHeight;
        current.detail.__collapseRaf = requestAnimationFrame(() => {
          current.detail.__collapseRaf = null;
          current.detail.style.maxHeight = "0px";
          current.detail.style.opacity = "0";
          current.detail.style.transform = "translateY(-6px)";
          current.detail.style.marginTop = "0px";
          current.detail.style.paddingTop = "0px";
          current.detail.style.paddingBottom = "0px";
          current.detail.style.borderWidth = "0px";
          current.detail.style.borderColor = "transparent";
        });
        current.detail.__closeTimer = setTimeout(() => {
          current.detail.style.display = "none";
          current.detail.__closeTimer = null;
        }, detailTransitionMs + 24);
      }
      activeIndex = -1;
    };

    const scrollDetailIntoView = detailNode => {
      const rect = detailNode.getBoundingClientRect();
      const topMargin = 96;
      const bottomMargin = 40;
      if (rect.bottom > window.innerHeight - bottomMargin) {
        const delta = rect.bottom - (window.innerHeight - bottomMargin);
        if (Math.abs(delta) > 8) window.scrollBy({ top: delta + 6, behavior: reducedMotion ? "auto" : "smooth" });
      } else if (rect.top < topMargin) {
        const delta = rect.top - topMargin;
        if (Math.abs(delta) > 8) window.scrollBy({ top: delta - 6, behavior: reducedMotion ? "auto" : "smooth" });
      }
    };

    const openAt = index => {
      if (index < 0 || index >= nodes.length) return;
      if (activeIndex >= 0 && activeIndex !== index) closeAt(activeIndex);
      const current = nodes[index];
      const border = pointBorderColor(current.data, 0.92);
      current.card.style.borderStyle = "solid";
      current.card.style.borderColor = border;
      if (current.detail.__closeTimer) {
        clearTimeout(current.detail.__closeTimer);
        current.detail.__closeTimer = null;
      }
      current.detail.style.display = "block";
      current.detail.style.paddingTop = "16px";
      current.detail.style.paddingBottom = "16px";
      current.detail.style.borderWidth = "1px";
      current.detail.style.borderColor = pointBorderColor(current.data, 0.84);
      void current.detail.offsetHeight;
      const targetHeight = Math.ceil(current.detail.scrollHeight) + 6;
      current.detail.style.maxHeight = `${targetHeight}px`;
      current.detail.style.opacity = "1";
      current.detail.style.transform = "translateY(0)";
      current.detail.style.marginTop = "6px";
      current.card.classList.remove("sweep-mobile");
      void current.card.offsetWidth;
      current.card.classList.add("sweep-mobile");
      if (current.card.__sweepTimer) clearTimeout(current.card.__sweepTimer);
      current.card.__sweepTimer = setTimeout(() => current.card.classList.remove("sweep-mobile"), 620);
      activeIndex = index;
      setTimeout(() => scrollDetailIntoView(current.detail), reducedMotion ? 0 : 200);
    };

    mobileItems.forEach((d, i) => {
      const item = document.createElement("div");
      item.className = "timeline-mobile-item";

      const card = document.createElement("div");
      const isEducation = d.type === "education";
      const chips = (Array.isArray(d.tech) && d.tech.length ? d.tech : extractTech(d.text)).slice(0, 5);
      const cardStyle = isEducation
        ? "background: linear-gradient(135deg, rgba(14,116,144,.46) 0%, rgba(8,47,73,.52) 45%, rgba(15,23,42,.84) 100%);"
        : "background: linear-gradient(135deg, rgba(15,23,42,.88) 0%, rgba(30,41,59,.72) 52%, rgba(15,23,42,.9) 100%);";
      card.className = `timeline-card ${isEducation ? "timeline-card-edu" : ""} rounded-2xl border p-4 text-slate-200`;
      card.style.borderStyle = "dashed";
      card.style.borderColor = neutralBorder;
      card.style.borderWidth = "1px";
      card.style.boxShadow = "0 14px 34px rgba(2,6,23,.45)";
      card.style.cssText += cardStyle;
      card.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <p class="font-black text-white text-sm">${safeText(d.company, "")}</p>
          <span class="text-xs text-slate-400">${formatPeriod(d)}</span>
        </div>
        <div class="mt-2 flex items-center gap-2">
          <span style="width:10px;height:10px;border-radius:999px;background:${pointColor(d)};display:inline-block;"></span>
          <p class="text-sm text-cyan-200">${safeText(d.role, "")}</p>
        </div>
        <p class="text-xs text-slate-400 mt-2 leading-relaxed">${safeText(d.text, "")}</p>
        <div class="mt-3">
          ${chips.map(chip => `<span class="timeline-tech-chip" style="display:inline-block; margin:0 .55rem .55rem 0; padding:.44rem .84rem;">${chip}</span>`).join("")}
        </div>
      `;

      const detail = document.createElement("div");
      detail.className = "mt-1 rounded-2xl border bg-slate-950/98 p-4 text-xs text-slate-200 shadow-[0_14px_34px_rgba(8,47,73,.45)]";
      detail.style.display = "none";
      detail.style.borderStyle = "dashed";
      detail.style.overflow = "hidden";
      detail.style.maxHeight = "0px";
      detail.style.opacity = "0";
      detail.style.transform = "translateY(-6px)";
      detail.style.marginTop = "0px";
      detail.style.paddingTop = "0px";
      detail.style.paddingBottom = "0px";
      detail.style.borderWidth = "0px";
      detail.style.borderColor = "transparent";
      detail.style.transition = reducedMotion
        ? "none"
        : `max-height ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), margin-top ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), padding-top ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), padding-bottom ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), border-width ${detailTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), border-color .22s ease`;
      detail.innerHTML = `
        <p class="mb-2 text-cyan-300 font-bold">${d.type === "education" ? "Tech" : "Highlights"}</p>
        <ul class="space-y-2 text-slate-300 leading-relaxed">
          ${getDetailItems(d).map(itemText => `<li class="flex items-start gap-2"><span class="text-cyan-300 mt-[1px]">•</span><span>${beautify(itemText)}</span></li>`).join("")}
        </ul>
      `;

      card.addEventListener("click", event => {
        event.stopPropagation();
        if (activeIndex === i) {
          closeAt(i);
          return;
        }
        openAt(i);
      });

      item.appendChild(card);
      item.appendChild(detail);
      list.appendChild(item);
      nodes.push({ data: d, card, detail });
    });

    const onDocumentClick = event => {
      if (!el.contains(event.target) && activeIndex >= 0) closeAt(activeIndex);
    };
    document.addEventListener("click", onDocumentClick);
    el.__timelineCleanup = () => {
      document.removeEventListener("click", onDocumentClick);
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

    const timelineTipHtml = "<span class=\"text-cyan-300 font-bold\">Tip:</span> tap a work card to expand highlights, or an education card to expand tech. Tap outside to close.";
    const timelineTipTarget = document.getElementById("timeline-tip");
    if (timelineTipTarget) {
      timelineTipTarget.className = "section-tip-contrast mb-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300";
      timelineTipTarget.innerHTML = timelineTipHtml;
    } else {
      const timelineTip = document.createElement("div");
      timelineTip.className = "section-tip-contrast mt-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300";
      timelineTip.innerHTML = timelineTipHtml;
      el.appendChild(timelineTip);
    }
    return;
  }

  const totalRows = d3.max(placed, d => d.row) + 1;
  const desktopH = trackY + cardsTopOffset + totalRows * (cardH + rowGap) + 84;
  const mobileBottom = isMobile && placed.length ? (placed[placed.length - 1].cardTop + placed[placed.length - 1].cardHeight + 84) : 0;
  const h = isMobile ? mobileBottom : desktopH;
  const getCardTop = d => isMobile ? d.cardTop : (trackY + cardsTopOffset + d.row * (cardH + rowGap));
  const getCardHeight = d => isMobile ? d.cardHeight : cardH;
  const getCardVisualHeight = d => isMobile ? (d.renderedCardHeight || d.cardHeight) : cardH;
  const svg = d3.select(el)
    .append("svg")
    .attr("viewBox", [0, 0, w, h])
    .attr("width", "100%")
    .attr("height", h)
    .style("display", "block");

  svg.append("line")
    .attr("x1", x(minYear))
    .attr("x2", x(maxYear))
    .attr("y1", trackY)
    .attr("y2", trackY)
    .attr("stroke", "rgba(103,232,249,.45)")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "6 8");

  svg.append("g")
    .attr("transform", `translate(0,${trackY + 18})`)
    .call(
      d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .ticks(isMobile ? (isNarrowMobile ? 4 : 5) : Math.min(9, Math.max(4, maxYear - minYear + 1)))
    )
    .call(g => g.selectAll("text").attr("fill", "#94a3b8").attr("font-size", 11))
    .call(g => g.selectAll("path,line").attr("stroke", "rgba(148,163,184,.22)"));

  const nodes = svg.selectAll(".timeline-node")
    .data(placed)
    .join("g")
    .attr("class", "timeline-node")
    .attr("transform", d => `translate(${d.cx},${trackY})`);

  nodes.append("circle")
    .attr("r", 0)
    .attr("fill", (d, i) => palette[i % palette.length])
    .attr("stroke", "rgba(255,255,255,.45)")
    .attr("stroke-width", 1.2)
    .transition()
    .duration(reducedMotion ? 0 : 500)
    .delay((d, i) => i * 90)
    .attr("r", 6);

  nodes.append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", 8)
    .attr("y2", d => getCardTop(d) - trackY - (isMobile ? 10 : 2))
    .attr("stroke", "rgba(103,232,249,.62)")
    .attr("stroke-width", isMobile ? 1.4 : 2)
    .attr("stroke-linecap", "round")
    .attr("stroke-dasharray", "5 7")
    .attr("opacity", 0)
    .transition()
    .duration(reducedMotion ? 0 : 520)
    .delay((d, i) => 120 + i * 80)
    .attr("opacity", isMobile ? .55 : .95);

  const cards = svg.selectAll(".timeline-card-group")
    .data(placed)
    .join("g")
    .attr("class", "timeline-card-group")
    .attr("transform", d => (isMobile ? "translate(0,0)" : `translate(${d.left},${getCardTop(d)})`))
    .attr("opacity", 0)
    .on("mousemove", (event, d) => {
      if (isMobile) return;
      const isEducation = d.type === "education";
      const detailItems = (isEducation
        ? (Array.isArray(d.tech) ? d.tech.filter(Boolean) : [])
        : (Array.isArray(d.highlights) ? d.highlights.filter(Boolean) : [])
      ).slice(0, 5);
      const detailLabel = isEducation ? "Tech" : "Highlights";
      const detailsHtml = detailItems.length
        ? `<p class="mt-2 text-slate-300"><small><strong>${detailLabel}:</strong><br>${detailItems.map(item => `• ${item}`).join("<br>")}</small></p>`
        : "";
      const kind = d.type === "education" ? "Education" : "Work";
      showTip(
        event,
        `<strong>${d.company}</strong><br><small>${kind} · ${d.role}</small>${detailsHtml}`,
        true
      );
    })
    .on("mouseleave", () => {
      if (!isMobile) hideTip();
    });

  cards.on("mouseenter", function() {
      d3.select(this).select(".timeline-card")
        .transition()
        .duration(reducedMotion ? 0 : 180)
        .style("box-shadow", "0 16px 38px rgba(8,47,73,.45)");
    })
    .on("mouseleave", function() {
      d3.select(this).select(".timeline-card")
        .transition()
        .duration(reducedMotion ? 0 : 180)
        .style("box-shadow", "0 14px 34px rgba(2, 6, 23, .45)");
      if (!isMobile) hideTip();
    });

  cards.append("foreignObject")
    .attr("class", "timeline-card-fo")
    .attr("x", d => (isMobile ? d.left - 2 : -2))
    .attr("y", d => (isMobile ? getCardTop(d) : -18))
    .attr("width", cardW + 4)
    .attr("height", d => getCardVisualHeight(d) + (isMobile ? 4 : 36))
    .html(d => {
      const period = `${Math.floor(d.start)} - ${Math.floor(d.end) >= CURRENT_YEAR ? "Present" : Math.floor(d.end)}`;
      const chips = (Array.isArray(d.tech) && d.tech.length ? d.tech : extractTech(d.text)).slice(0, 5);
      const isEducation = d.type === "education";
      const shellBorder = isEducation ? "border-transparent" : "border-slate-800";
      const shellBg = isEducation ? "" : "";
      const shellStyle = isEducation
        ? "background: linear-gradient(135deg, rgba(14,116,144,.46) 0%, rgba(8,47,73,.52) 45%, rgba(15,23,42,.84) 100%);"
        : "background: linear-gradient(135deg, rgba(15,23,42,.88) 0%, rgba(30,41,59,.72) 52%, rgba(15,23,42,.9) 100%);";
      const roleColor = "text-cyan-200";
      const timelineTypeClass = isEducation ? "timeline-card-edu" : "";
      return `
        <body xmlns="http://www.w3.org/1999/xhtml" style="margin:0;padding:0;">
          <div class="timeline-card ${timelineTypeClass} rounded-2xl border ${shellBorder} ${shellBg} p-4 text-slate-200" style="${shellStyle}">
            <div class="flex items-center justify-between gap-3">
              <p class="font-black text-white text-sm">${d.company}</p>
              <span class="text-xs text-slate-400">${period}</span>
            </div>
            <p class="text-sm ${roleColor} mt-1">${d.role}</p>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed" style="margin-top:.7rem;">${d.text}</p>
            <div class="mt-3" style="margin-top:1.05rem;">
              ${chips.map(chip => `<span class="timeline-tech-chip" style="display:inline-block; margin:0 .55rem .55rem 0; padding:.44rem .84rem;">${chip}</span>`).join("")}
            </div>
          </div>
        </body>
      `;
    });

  cards.transition()
    .duration(reducedMotion ? 0 : 620)
    .delay((d, i) => 160 + i * 90)
    .ease(d3.easeCubicOut)
    .attr("opacity", 1)
    .attrTween("transform", function(d) {
      if (isMobile) return () => "translate(0,0)";
      const baseX = d.left;
      const baseY = getCardTop(d);
      const iy = d3.interpolateNumber(14, 0);
      return t => `translate(${baseX},${baseY + iy(t)})`;
    });

  if (!isMobile) {
    let desktopActiveNode = null;
    const applyDesktopFocus = (selected = null) => {
      const hasSelected = !!selected;
      cards.transition().duration(220)
        .attr("opacity", d => !hasSelected ? 1 : (d === selected ? 1 : 0.38));
      cards.select(".timeline-card").transition().duration(220)
        .style("box-shadow", d => (!hasSelected || d === selected)
          ? "0 16px 38px rgba(8,47,73,.45)"
          : "0 8px 18px rgba(2,6,23,.26)")
        .style("border-style", d => (!hasSelected ? "solid" : (d === selected ? "solid" : "dashed")))
        .style("border-color", d => (!hasSelected
          ? "rgba(148,163,184,.22)"
          : (d === selected ? pointBorderColor(d, 0.92) : "rgba(148,163,184,.22)")))
        .style("filter", d => (!hasSelected || d === selected) ? "none" : "saturate(.75)");
      nodes.select("line").transition().duration(220)
        .attr("opacity", d => !hasSelected ? .95 : (d === selected ? .95 : .18));
      nodes.select("circle").transition().duration(220)
        .attr("opacity", d => !hasSelected ? 1 : (d === selected ? 1 : .45))
        .attr("stroke-width", d => !hasSelected ? 1.2 : (d === selected ? 1.9 : 1.1));
    };

    const toggleDesktopSelection = (event, d) => {
      event.stopPropagation();
      desktopActiveNode = desktopActiveNode === d ? null : d;
      applyDesktopFocus(desktopActiveNode);
    };

    cards.on("click", toggleDesktopSelection);
    nodes.on("click", toggleDesktopSelection);
    svg.on("click", () => {
      desktopActiveNode = null;
      applyDesktopFocus(null);
    });
  }

  if (isMobile) {
    const mobileCardGap = 24;
    const detailTopGap = Math.round(mobileCardGap / 4);
    const detailBottomGap = mobileCardGap;
    const mobileSweepDurationMs = 620;
    const canSmoothScroll = typeof document !== "undefined" && "scrollBehavior" in document.documentElement.style;
    const baseCardY = d => getCardTop(d);
    let activeNode = null;
    let pendingScrollTimer = null;

    const recalculateMobileLayout = () => {
      let cursorY = trackY + cardsTopOffset;
      cards.each(function(d) {
        const cardEl = this.querySelector(".timeline-card");
        const foEl = this.querySelector(".timeline-card-fo");
        const cardHeightMeasured = cardEl ? cardEl.getBoundingClientRect().height : 0;
        const foHeightMeasured = foEl ? Math.max(0, foEl.getBoundingClientRect().height - 4) : 0;
        const visualMeasured = Math.max(cardHeightMeasured, foHeightMeasured, 140);
        d.renderedCardHeight = Math.ceil(visualMeasured) || d.renderedCardHeight || d.cardHeight || 170;
        d.cardHeight = Math.max(170, d.renderedCardHeight);
        d.cardTop = cursorY;
        cursorY += d.cardHeight + mobileCardGap;
      });
      cards.attr("transform", "translate(0,0)");
      cards.select(".timeline-card-fo").attr("height", d => getCardVisualHeight(d) + 4);
      cards.select(".timeline-card-fo")
        .attr("x", d => d.left - 2)
        .attr("y", d => baseCardY(d));
      nodes.select("line").attr("y2", d => getCardTop(d) - trackY - 10);
      const baseBottom = placed.length ? (placed[placed.length - 1].cardTop + placed[placed.length - 1].cardHeight + 84) : (trackY + 200);
      svg.attr("viewBox", [0, 0, w, baseBottom]).attr("height", baseBottom);
      cards.attr("opacity", 1);
    };

    const detailGroup = svg.append("g").style("display", "none");
    const detailFo = detailGroup.append("foreignObject")
      .attr("x", -2)
      .attr("y", 0)
      .attr("width", cardW + 4)
      .attr("height", 160);
    const detailBorderColor = () => {
      if (!activeNode) return "rgba(103,232,249,.70)";
      return pointBorderColor(activeNode, 0.84);
    };
    let activeDetailHeight = 0;
    const styleCardsBySelection = () => {
      cards.select(".timeline-card")
        .style("border-style", x => (activeNode && x === activeNode ? "solid" : "dashed"))
        .style("border-color", x => {
          if (activeNode && x === activeNode) return pointBorderColor(x, 0.92);
          return "rgba(148,163,184,.32)";
        })
        .style("border-width", "1px");
    };

    const getDetailItems = d => {
      if (!d) return [];
      if (d.type === "education") {
        const techItems = Array.isArray(d.tech) ? d.tech.filter(Boolean) : [];
        return techItems.length ? techItems : ["No tech provided."];
      }
      const highlights = Array.isArray(d.highlights) ? d.highlights.filter(Boolean) : [];
      return highlights.length ? highlights : ["No highlights provided."];
    };

    const getDetailHeight = d => {
      if (!d) return 0;
      const items = getDetailItems(d);

      const base = 72;
      const perItem = 24;
      const minHeight = 112;

      return Math.max(minHeight, base + items.length * perItem);
    };

    const rowShift = row => {
      if (!activeNode || row <= activeNode.row) return 0;
      const extraSpaceNeeded = activeDetailHeight + detailTopGap + detailBottomGap;
      return Math.max(0, extraSpaceNeeded - mobileCardGap);
    };

    const renderDetailHtml = d => {
      const items = getDetailItems(d);
      const sectionLabel = d?.type === "education" ? "Tech" : "Highlights";
      const beautifyHighlight = value => {
        const txt = safeText(value, "");
        if (!txt) return "";
        const normalized = txt.replace(/\s+/g, " ").trim();
        return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
      };
      return `
        <body xmlns="http://www.w3.org/1999/xhtml" style="margin:0;padding:0;">
          <div style="border-color:${detailBorderColor()};border-style:dashed;" class="h-full rounded-2xl border bg-slate-950/98 p-4 text-xs text-slate-200 shadow-[0_14px_34px_rgba(8,47,73,.45)]">
            <p class="mb-2 text-cyan-300 font-bold">${sectionLabel}</p>
            <ul class="space-y-2 text-slate-300 leading-relaxed">
              ${items.map(item => `<li class="flex items-start gap-2"><span class="text-cyan-300 mt-[1px]">•</span><span>${beautifyHighlight(item)}</span></li>`).join("")}
            </ul>
          </div>
        </body>
      `;
    };

    const triggerMobileSweep = targetNode => {
      cards.select(".timeline-card").each(function() {
        if (this.__sweepTimer) {
          clearTimeout(this.__sweepTimer);
          this.__sweepTimer = null;
        }
        this.classList.remove("sweep-mobile");
      });
      if (!targetNode) return;
      const cardNode = cards.filter(x => x === targetNode).select(".timeline-card").node();
      if (!cardNode) return;
      void cardNode.offsetWidth;
      cardNode.classList.add("sweep-mobile");
      cardNode.__sweepTimer = setTimeout(() => {
        cardNode.classList.remove("sweep-mobile");
        cardNode.__sweepTimer = null;
      }, mobileSweepDurationMs);
    };

    const scrollActiveDetailIntoView = () => {
      if (!activeNode || detailGroup.style("display") === "none") return;
      const detailRect = detailFo.node()?.getBoundingClientRect();
      if (!detailRect) return;
      const topMargin = 96;
      const bottomMargin = 40;
      const scrollByDelta = delta => {
        if (!delta || Number.isNaN(delta)) return;
        const behavior = !reducedMotion && canSmoothScroll ? "smooth" : "auto";
        if (typeof window.scrollBy === "function") {
          window.scrollBy({ top: delta, behavior });
          return;
        }
        const current = window.pageYOffset || document.documentElement.scrollTop || 0;
        window.scrollTo(0, current + delta);
      };
      if (detailRect.bottom > window.innerHeight - bottomMargin) {
        const delta = detailRect.bottom - (window.innerHeight - bottomMargin);
        if (Math.abs(delta) < 16) return;
        scrollByDelta(Math.ceil(delta + 6));
        return;
      }
      if (detailRect.top < topMargin) {
        const delta = detailRect.top - topMargin;
        if (Math.abs(delta) < 16) return;
        scrollByDelta(Math.floor(delta - 6));
      }
    };

    const getActiveCardBottomY = () => {
      if (!activeNode) return 0;
      const activeCardNode = cards
        .filter(x => x === activeNode)
        .select(".timeline-card")
        .node();
      const runtimeHeight = activeCardNode ? Math.ceil(activeCardNode.getBoundingClientRect().height) : 0;
      const visualHeight = Math.max(runtimeHeight, getCardVisualHeight(activeNode));
      return baseCardY(activeNode) + visualHeight;
    };

    const applyMobileTimelineLayout = (animated = true) => {
      const duration = animated && !reducedMotion ? 220 : 0;
      const baseBottom = placed.length
        ? (placed[placed.length - 1].cardTop + placed[placed.length - 1].cardHeight + 36)
        : (trackY + 200);

      cards.interrupt();
      cards.select(".timeline-card-fo").interrupt();
      nodes.select("line").interrupt();
      detailGroup.interrupt();
      detailFo.interrupt();

      if (activeNode) {
        const estimatedHeight = getDetailHeight(activeNode);
        const minDetailHeight = 112;
        const activeBottomY = getActiveCardBottomY();
        detailGroup.style("display", null);
        detailFo
          .attr("x", activeNode.left - 2)
          .attr("y", activeBottomY + detailTopGap);
        detailFo.attr("height", estimatedHeight);
        detailFo.html(renderDetailHtml(activeNode));
        const detailRoot = detailFo.node()?.querySelector("div");
        const measuredDetailHeight = detailRoot
          ? Math.ceil(Math.max(detailRoot.getBoundingClientRect().height, detailRoot.scrollHeight)) + 24
          : estimatedHeight;
        activeDetailHeight = Math.max(minDetailHeight, estimatedHeight, measuredDetailHeight);
        detailFo.attr("height", activeDetailHeight);
      } else {
        activeDetailHeight = 0;
      }

      cards.transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr("transform", "translate(0,0)");

      cards.select(".timeline-card-fo")
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr("x", d => d.left - 2)
        .attr("y", d => baseCardY(d) + rowShift(d.row));

      nodes.select("line")
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr("y2", d => getCardTop(d) - trackY + rowShift(d.row) - 10);

      if (!activeNode) {
        detailGroup.attr("data-open", "");
        if (duration > 0) {
          detailGroup.transition()
            .duration(200)
            .ease(d3.easeCubicInOut)
            .attr("opacity", 0)
            .on("start", () => {
              const y = Number(detailFo.attr("y")) || 0;
              detailFo.attr("y", y + 8);
            })
            .on("end", () => detailGroup.style("display", "none"));
        } else {
          detailGroup.attr("opacity", 0).style("display", "none");
        }
        cards.select(".timeline-card").classed("ring-2 ring-cyan-300/60", false);
        triggerMobileSweep(null);
        styleCardsBySelection();
        svg.attr("viewBox", [0, 0, w, baseBottom]).attr("height", baseBottom);
        return;
      }

      const targetX = activeNode.left;
      const targetY = getActiveCardBottomY() + detailTopGap;
      detailGroup.transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);
      detailFo.transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr("x", targetX - 2)
        .attr("y", targetY);
      if (!detailGroup.attr("data-open")) {
        detailGroup
          .style("display", null)
          .attr("opacity", 0);
        detailFo
          .attr("x", targetX - 2)
          .attr("y", targetY + 10);
        detailGroup.transition()
          .duration(duration)
          .ease(d3.easeCubicOut)
          .attr("opacity", 1);
        detailFo.transition()
          .duration(duration)
          .ease(d3.easeCubicOut)
          .attr("x", targetX - 2)
          .attr("y", targetY);
      } else {
        detailGroup.style("display", null).attr("opacity", 1);
      }
      detailGroup.attr("data-open", "1");
      cards.select(".timeline-card").classed("ring-2 ring-cyan-300/60", x => x === activeNode);
      triggerMobileSweep(activeNode);
      styleCardsBySelection();
      const shiftedLastBottom = placed.length
        ? (placed[placed.length - 1].cardTop + rowShift(placed[placed.length - 1].row) + placed[placed.length - 1].cardHeight)
        : (trackY + 180);
      const activeDetailBottom = getActiveCardBottomY() + detailTopGap + activeDetailHeight;
      const expandedBottom = Math.max(shiftedLastBottom, activeDetailBottom) + 36;
      svg.attr("viewBox", [0, 0, w, expandedBottom]).attr("height", expandedBottom);
      if (pendingScrollTimer) clearTimeout(pendingScrollTimer);
      pendingScrollTimer = setTimeout(() => {
        pendingScrollTimer = null;
        scrollActiveDetailIntoView();
      }, duration + 40);
    };

    cards.on("click", (event, d) => {
      event.stopPropagation();
      activeNode = activeNode === d ? null : d;
      applyMobileTimelineLayout();
    });

    svg.on("click", () => {
      activeNode = null;
      detailGroup.attr("data-open", "");
      applyMobileTimelineLayout();
    });

    requestAnimationFrame(() => {
      recalculateMobileLayout();
      applyMobileTimelineLayout(false);
      styleCardsBySelection();
    });
  }

  const timelineTipHtml = isMobile
    ? "<span class=\"text-cyan-300 font-bold\">Tip:</span> tap a work card to expand highlights, or an education card to expand tech. Tap outside to close."
    : "<span class=\"text-cyan-300 font-bold\">Tip:</span> hover cards to inspect details, or click a card/point to focus and dim the rest. Click outside to reset.";
  const timelineTipTarget = document.getElementById("timeline-tip");
  if (timelineTipTarget) {
    timelineTipTarget.className = "section-tip-contrast mb-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300";
    timelineTipTarget.innerHTML = timelineTipHtml;
  } else {
    const timelineTip = document.createElement("div");
    timelineTip.className = "section-tip-contrast mt-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300";
    timelineTip.innerHTML = timelineTipHtml;
    el.appendChild(timelineTip);
  }
}

export { timeline };
