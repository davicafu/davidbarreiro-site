import { appState, CURRENT_YEAR, palette, reducedMotion } from './state.js';
import { safeText } from './utils.js';
import { showTip, hideTip } from './ui.js';
function timeline(){
  const el = document.getElementById("timeline");
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
        cardHeight: 210
      };
      cursorY += withLayout.cardHeight + 22;
      return withLayout;
    });
  }

  const totalRows = d3.max(placed, d => d.row) + 1;
  const desktopH = trackY + cardsTopOffset + totalRows * (cardH + rowGap) + 84;
  const mobileBottom = isMobile && placed.length ? (placed[placed.length - 1].cardTop + placed[placed.length - 1].cardHeight + 84) : 0;
  const h = isMobile ? mobileBottom : desktopH;
  const getCardTop = d => isMobile ? d.cardTop : (trackY + cardsTopOffset + d.row * (cardH + rowGap));
  const getCardHeight = d => isMobile ? d.cardHeight : cardH;
  const svg = d3.select(el).append("svg").attr("viewBox", [0, 0, w, h]);

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
    .attr("transform", d => `translate(${d.left},${getCardTop(d)})`)
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
    .attr("x", -2)
    .attr("y", -18)
    .attr("width", cardW + 4)
    .attr("height", d => getCardHeight(d) + 36)
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
      `;
    });

  cards.transition()
    .duration(reducedMotion ? 0 : 620)
    .delay((d, i) => 160 + i * 90)
    .ease(d3.easeCubicOut)
    .attr("opacity", 1)
    .attrTween("transform", function(d) {
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
    const detailGap = 10;
    const baseCardY = d => getCardTop(d);
    let activeNode = null;
    const mobileCardGap = 24;

    const recalculateMobileLayout = () => {
      let cursorY = trackY + cardsTopOffset;
      cards.each(function(d) {
        const cardEl = this.querySelector(".timeline-card");
        const measured = cardEl ? Math.ceil(cardEl.getBoundingClientRect().height) : 170;
        d.cardHeight = Math.max(170, measured + 4);
        d.cardTop = cursorY;
        cursorY += d.cardHeight + mobileCardGap;
      });
      cards.attr("transform", d => `translate(${d.left},${baseCardY(d)})`);
      cards.select(".timeline-card-fo").attr("height", d => getCardHeight(d) + 36);
      nodes.select("line").attr("y2", d => getCardTop(d) - trackY - 10);
      const baseBottom = placed.length ? (placed[placed.length - 1].cardTop + placed[placed.length - 1].cardHeight + 84) : (trackY + 200);
      svg.attr("viewBox", [0, 0, w, baseBottom]);
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
      const idx = placed.indexOf(activeNode);
      return rgbaWithAlpha(palette[Math.max(0, idx) % palette.length], 0.78);
    };
    let activeDetailHeight = 0;
    const rgbaWithAlpha = (color, alpha) => {
      const c = d3.color(color);
      if (!c) return color;
      c.opacity = alpha;
      return c.formatRgb();
    };
    const styleCardsBySelection = () => {
      cards.select(".timeline-card")
        .style("border-style", x => (activeNode && x === activeNode ? "solid" : "dashed"))
        .style("border-color", (x, i) => {
          if (activeNode && x === activeNode) return rgbaWithAlpha(palette[i % palette.length], 0.9);
          return rgbaWithAlpha(palette[i % palette.length], 0.62);
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
      return Math.max(166, 92 + items.length * 24);
    };

    const rowShift = row => (activeNode && row > activeNode.row ? activeDetailHeight + detailGap + 6 : 0);

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
        <div style="border-color:${detailBorderColor()};border-style:dashed;" class="h-full rounded-2xl border bg-slate-950/98 p-4 text-xs text-slate-200 shadow-[0_14px_34px_rgba(8,47,73,.45)]">
          <p class="mb-2 text-cyan-300 font-bold">${sectionLabel}</p>
          <ul class="space-y-2 text-slate-300 leading-relaxed">
            ${items.map(item => `<li class="flex items-start gap-2"><span class="text-cyan-300 mt-[1px]">•</span><span>${beautifyHighlight(item)}</span></li>`).join("")}
          </ul>
        </div>
      `;
    };

    const applyMobileTimelineLayout = (animated = true) => {
      const duration = animated && !reducedMotion ? 360 : 0;
      const baseBottom = placed.length
        ? (placed[placed.length - 1].cardTop + placed[placed.length - 1].cardHeight + 36)
        : (trackY + 200);

      if (activeNode) {
        const estimatedHeight = getDetailHeight(activeNode);
        detailGroup.style("display", null);
        detailGroup.attr("transform", `translate(${activeNode.left},${baseCardY(activeNode) + getCardHeight(activeNode) + detailGap})`);
        detailFo.attr("height", estimatedHeight);
        detailFo.html(renderDetailHtml(activeNode));
        const detailRoot = detailFo.node()?.firstElementChild;
        const measuredDetailHeight = detailRoot
          ? Math.ceil(Math.max(detailRoot.getBoundingClientRect().height, detailRoot.scrollHeight)) + 28
          : estimatedHeight;
        activeDetailHeight = Math.max(estimatedHeight, measuredDetailHeight);
        detailFo.attr("height", activeDetailHeight);
      } else {
        activeDetailHeight = 0;
      }

      cards.transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr("transform", d => `translate(${d.left},${baseCardY(d) + rowShift(d.row)})`);

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
            .attr("transform", `translate(${detailGroup.attr("data-x") || 0},${(Number(detailGroup.attr("data-y")) || 0) + 8})`)
            .on("end", () => detailGroup.style("display", "none"));
        } else {
          detailGroup.attr("opacity", 0).style("display", "none");
        }
        cards.select(".timeline-card").classed("ring-2 ring-cyan-300/60", false);
        styleCardsBySelection();
        svg.attr("viewBox", [0, 0, w, baseBottom]);
        return;
      }

      const targetX = activeNode.left;
      const targetY = baseCardY(activeNode) + getCardHeight(activeNode) + detailGap;
      detailGroup.transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr("transform", `translate(${targetX},${targetY})`)
        .attr("opacity", 1);
      if (!detailGroup.attr("data-open")) {
        detailGroup
          .style("display", null)
          .attr("opacity", 0)
          .attr("transform", `translate(${targetX},${targetY + 10})`);
        detailGroup.transition()
          .duration(duration)
          .ease(d3.easeCubicOut)
          .attr("transform", `translate(${targetX},${targetY})`)
          .attr("opacity", 1);
      } else {
        detailGroup.style("display", null).attr("opacity", 1);
      }
      detailGroup.attr("data-open", "1").attr("data-x", targetX).attr("data-y", targetY);
      cards.select(".timeline-card").classed("ring-2 ring-cyan-300/60", x => x === activeNode);
      styleCardsBySelection();
      const shiftedLastBottom = placed.length
        ? (placed[placed.length - 1].cardTop + rowShift(placed[placed.length - 1].row) + placed[placed.length - 1].cardHeight)
        : (trackY + 180);
      const activeDetailBottom = baseCardY(activeNode) + getCardHeight(activeNode) + detailGap + activeDetailHeight;
      const expandedBottom = Math.max(shiftedLastBottom, activeDetailBottom) + 36;
      svg.attr("viewBox", [0, 0, w, expandedBottom]);
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

  const timelineTip = document.createElement("div");
  timelineTip.className = "mt-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300";
  timelineTip.innerHTML = isMobile
    ? "<span class=\"text-cyan-300 font-bold\">Tip:</span> tap a work card to expand highlights, or an education card to expand tech. Tap outside to close."
    : "<span class=\"text-cyan-300 font-bold\">Tip:</span> hover cards to inspect details, or click a card/point to focus and dim the rest. Click outside to reset.";
  el.appendChild(timelineTip);
}

export { timeline };
