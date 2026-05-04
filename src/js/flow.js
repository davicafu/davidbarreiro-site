import { appState, palette, reducedMotion } from './state.js';
import { t } from './i18n.js';
function dataFlow(){
  const el = document.getElementById("flow");
  el.innerHTML = "";
  const w = el.clientWidth || 980;
  const isMobile = w < 800;
  const cardW = isMobile ? Math.min(520, w - 36) : Math.min(760, w - 70);
  const gap = isMobile ? 26 : 22;
  const topPad = 26;
  const left = (w - cardW) / 2;
  const detailPanelPad = 10;
  const detailPanelH = isMobile ? 144 : 126;
  const baseBottomPad = 28;
  const baseCardH = isMobile ? 134 : 116;

  const wrapTextLines = (value, maxCharsPerLine) => {
    const source = (value || "").trim();
    if (!source) return [""];
    const words = source.split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (next.length <= maxCharsPerLine || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    return lines;
  };

  const getChipRows = (stepWidth, techList) => {
    const startX = isMobile ? 38 : 44;
    const chipGapX = 8;
    const maxW = stepWidth - startX - 18;
    let x = startX;
    let rows = 1;
    techList.forEach((tech) => {
      const text = tech.length > 18 ? `${tech.slice(0, 17)}…` : tech;
      const chipW = Math.max(62, Math.min(isMobile ? 126 : 150, 20 + text.length * (isMobile ? 6.2 : 6.8)));
      if (x + chipW > startX + maxW) {
        rows += 1;
        x = startX;
      }
      x += chipW + chipGapX;
    });
    return rows;
  };

  const detailLineH = isMobile ? 14 : 15;
  const detailStartY = isMobile ? 54 : 61;
  const detailMaxChars = Math.max(26, Math.floor((cardW - (isMobile ? 58 : 66)) / (isMobile ? 5.8 : 6.5)));

  let runningY = topPad;
  const layout = appState.flow.map((step, i) => {
    const detailLines = wrapTextLines(step.detail, detailMaxChars);
    const chipStartY = detailStartY + (detailLines.length * detailLineH) + 10;
    const chipRows = getChipRows(cardW, step.tech);
    const chipH = 24;
    const chipGapY = 8;
    const chipBlockH = chipRows * chipH + Math.max(0, chipRows - 1) * chipGapY;
    const dynamicCardH = Math.max(baseCardH, chipStartY + chipBlockH + 18);
    const item = {
      ...step,
      i,
      x: left,
      y: runningY,
      width: cardW,
      height: dynamicCardH,
      color: palette[i % palette.length],
      detailLines,
      chipStartY
    };
    runningY += dynamicCardH + gap;
    return item;
  });

  const baseChartBottom = runningY - gap;
  const h = baseChartBottom + baseBottomPad;

  const svg = d3.select(el).append("svg").attr("viewBox", [0, 0, w, h]);
  const layerLinks = svg.append("g");
  const layerCards = svg.append("g");
  const layerDetail = svg.append("g");

  const links = d3.pairs(layout).map(([a, b], i) => ({
    id: `link-${i}`,
    from: a.i,
    to: b.i,
    x1: a.x + a.width / 2,
    y1: a.y + a.height + 3,
    x2: b.x + b.width / 2,
    y2: b.y - 6
  }));

  svg.append("defs").append("marker")
    .attr("id", "flow-arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 8)
    .attr("refY", 0)
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#67e8f9");
  const flowDefs = svg.append("defs");
  flowDefs.append("linearGradient")
    .attr("id", "flow-card-fx")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%")
    .selectAll("stop")
    .data([
      { o: "0%", c: "rgba(34,211,238,0)" },
      { o: "35%", c: "rgba(34,211,238,0)" },
      { o: "50%", c: "rgba(255,255,255,.24)" },
      { o: "65%", c: "rgba(34,211,238,.28)" },
      { o: "100%", c: "rgba(34,211,238,0)" }
    ])
    .join("stop")
    .attr("offset", d => d.o)
    .attr("stop-color", d => d.c);

  const linkEl = layerLinks.selectAll(".flow-link")
    .data(links)
    .join("line")
    .attr("class", "flow-link")
    .attr("x1", d => d.x1)
    .attr("y1", d => d.y1)
    .attr("x2", d => d.x1)
    .attr("y2", d => d.y1)
    .attr("stroke", "rgba(103,232,249,.62)")
    .attr("stroke-width", 2.3)
    .attr("stroke-dasharray", "6 8")
    .attr("marker-end", "url(#flow-arrow)")
    .attr("opacity", 0.88);

  linkEl.transition()
    .duration(reducedMotion ? 0 : 620)
    .delay((d, i) => i * 120)
    .ease(d3.easeCubicOut)
    .attr("x2", d => d.x2)
    .attr("y2", d => d.y2);

  const card = layerCards.selectAll(".flow-card")
    .data(layout)
    .join("g")
    .attr("class", "flow-card cursor-pointer")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("opacity", 0);

  card.append("rect")
    .attr("rx", 18)
    .attr("ry", 18)
    .attr("width", d => d.width)
    .attr("height", d => d.height)
    .attr("fill", "rgba(15,23,42,.7)")
    .attr("stroke", "rgba(148,163,184,.22)")
    .attr("stroke-width", 1.3);

  card.append("rect")
    .attr("x", 18)
    .attr("y", 18)
    .attr("width", isMobile ? 8 : 10)
    .attr("height", d => d.height - 36)
    .attr("rx", 999)
    .attr("fill", d => d.color)
    .attr("opacity", .95);

  card.append("text")
    .attr("x", isMobile ? 38 : 44)
    .attr("y", isMobile ? 34 : 38)
    .attr("fill", "#f8fafc")
    .attr("font-size", isMobile ? 14 : 16)
    .attr("font-weight", 900)
    .text(d => d.name);

  card.append("text")
    .attr("x", isMobile ? 38 : 44)
    .attr("y", detailStartY)
    .attr("fill", "#94a3b8")
    .attr("font-size", isMobile ? 11 : 12)
    .selectAll("tspan")
    .data(d => d.detailLines.map((line, idx) => ({ line, idx })))
    .join("tspan")
    .attr("x", isMobile ? 38 : 44)
    .attr("dy", item => item.idx === 0 ? 0 : detailLineH)
    .text(item => item.line);

  card.each(function(d) {
    const group = d3.select(this);
    const chipStartY = d.chipStartY;
    const startX = isMobile ? 38 : 44;
    const chipH = 24;
    const chipGapX = 8;
    const chipGapY = 8;
    const maxW = d.width - startX - 18;
    let x = startX;
    let y = chipStartY;

    d.tech.forEach((tech) => {
      const text = tech.length > 18 ? `${tech.slice(0, 17)}…` : tech;
      const chipW = Math.max(62, Math.min(isMobile ? 126 : 150, 20 + text.length * (isMobile ? 6.2 : 6.8)));

      if (x + chipW > startX + maxW) {
        x = startX;
        y += chipH + chipGapY;
      }

      group.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", chipW)
        .attr("height", chipH)
        .attr("rx", 999)
        .attr("fill", "rgba(255,255,255,.05)")
        .attr("stroke", "rgba(148,163,184,.24)")
        .attr("stroke-width", 1);
      group.append("text")
        .attr("x", x + chipW / 2)
        .attr("y", y + 16)
        .attr("text-anchor", "middle")
        .attr("fill", "#e2e8f0")
        .attr("font-size", isMobile ? 10 : 11)
        .attr("font-weight", 700)
        .text(text);

      x += chipW + chipGapX;
    });
  });

  card.transition()
    .duration(reducedMotion ? 0 : 520)
    .delay((d, i) => i * 90)
    .ease(d3.easeCubicOut)
    .attr("opacity", 1)
    .attrTween("transform", function(d) {
      const iy = d3.interpolateNumber(18, 0);
      return t => `translate(${d.x},${d.y + iy(t)})`;
    });

  const detailCard = layerDetail.append("g").style("display", "none");
  detailCard.append("rect")
    .attr("rx", 14)
    .attr("ry", 14)
    .attr("width", cardW)
    .attr("height", detailPanelH)
    .attr("fill", "rgba(2,6,23,.88)")
    .attr("stroke", "rgba(56,189,248,.42)")
    .attr("stroke-width", 1.2);
  const detailTitle = detailCard.append("text")
    .attr("x", 16)
    .attr("y", 24)
    .attr("fill", "#f8fafc")
    .attr("font-size", isMobile ? 12 : 13)
    .attr("font-weight", 900);
  const detailImpact = detailCard.append("text")
    .attr("x", 16)
    .attr("y", 46)
    .attr("fill", "#94a3b8")
    .attr("font-size", isMobile ? 10 : 11);
  const detailTech = detailCard.append("text")
    .attr("x", 16)
    .attr("fill", "#cbd5e1")
    .attr("font-size", isMobile ? 10 : 11)
    .attr("font-weight", 700);
  detailCard.attr("opacity", 0);
  const triggerFlowCardFx = index => {
    if (index < 0) return;
    const target = card.filter(d => d.i === index);
    if (target.empty()) return;
    target.selectAll(".flow-card-fx-overlay").remove();
    const baseRect = target.select("rect");
    baseRect.interrupt()
      .transition()
      .duration(reducedMotion ? 0 : 170)
      .ease(d3.easeCubicOut)
      .attr("fill", "rgba(20,40,68,.84)")
      .attr("stroke", "rgba(34,211,238,.42)")
      .attr("stroke-width", 1.6)
      .transition()
      .duration(reducedMotion ? 0 : 260)
      .ease(d3.easeCubicInOut)
      .attr("fill", "rgba(15,23,42,.7)")
      .attr("stroke", "rgba(148,163,184,.22)")
      .attr("stroke-width", 1.3);

    const trace = target.append("rect")
      .attr("class", "flow-card-fx-overlay")
      .attr("x", 0.5)
      .attr("y", 0.5)
      .attr("width", cardW - 1)
      .attr("height", d => d.height - 1)
      .attr("rx", 18)
      .attr("ry", 18)
      .attr("fill", "none")
      .attr("stroke", "rgba(34,211,238,.9)")
      .attr("stroke-width", 1.35)
      .attr("opacity", 0.95)
      .attr("stroke-linecap", "round")
      .style("pointer-events", "none");
    const per = 2 * (cardW + (layout[index]?.height || baseCardH));
    trace
      .attr("stroke-dasharray", per)
      .attr("stroke-dashoffset", per)
      .transition()
      .duration(reducedMotion ? 0 : 560)
      .ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0)
      .transition()
      .duration(reducedMotion ? 0 : 220)
      .attr("opacity", 0.12)
      .remove();

    if (reducedMotion) return;
    const cardHeight = layout[index]?.height || baseCardH;
    const sparks = target.append("g")
      .attr("class", "flow-card-fx-overlay")
      .style("pointer-events", "none");
    const cornerData = [
      { x: 14, y: 14, dx: 16, dy: 12 },
      { x: cardW - 14, y: 14, dx: -16, dy: 12 },
      { x: 14, y: cardHeight - 14, dx: 16, dy: -12 },
      { x: cardW - 14, y: cardHeight - 14, dx: -16, dy: -12 }
    ];
    sparks.selectAll("line")
      .data(cornerData)
      .join("line")
      .attr("x1", d => d.x)
      .attr("y1", d => d.y)
      .attr("x2", d => d.x)
      .attr("y2", d => d.y)
      .attr("stroke", "rgba(103,232,249,.95)")
      .attr("stroke-width", 1.6)
      .attr("stroke-linecap", "round")
      .attr("opacity", 0.95)
      .transition()
      .duration(320)
      .ease(d3.easeCubicOut)
      .attr("x2", d => d.x + d.dx)
      .attr("y2", d => d.y + d.dy)
      .attr("opacity", 0)
      .remove();
    sparks.selectAll("circle")
      .data(cornerData)
      .join("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 1.2)
      .attr("fill", "rgba(186,230,253,.95)")
      .attr("opacity", 1)
      .transition()
      .duration(280)
      .ease(d3.easeCubicOut)
      .attr("r", 0.2)
      .attr("opacity", 0)
      .on("end", function(_, i) {
        if (i === cornerData.length - 1) sparks.remove();
      });
  };

  const getDetailShift = () => detailPanelH + detailPanelPad + 8;
  const getCardOffsetY = (cardIndex, expandedIndex) => (
    expandedIndex >= 0 && cardIndex > expandedIndex ? getDetailShift() : 0
  );
  const setFlowViewBox = expandedIndex => {
    if (expandedIndex < 0) {
      svg.attr("viewBox", [0, 0, w, baseChartBottom + baseBottomPad]);
      return;
    }
    const step = layout[expandedIndex];
    const detailBottom = step.y + step.height + detailPanelPad + detailPanelH;
    const shiftedLastBottom = layout.length
      ? (layout[layout.length - 1].y + getCardOffsetY(layout[layout.length - 1].i, expandedIndex) + layout[layout.length - 1].height)
      : baseChartBottom;
    const finalBottom = Math.max(detailBottom, shiftedLastBottom);
    svg.attr("viewBox", [0, 0, w, finalBottom + baseBottomPad]);
  };

  function applyFlowLayout(expandedIndex = -1, animated = true) {
    const duration = animated && !reducedMotion ? 620 : 0;
    card.transition().duration(duration).ease(d3.easeCubicOut)
      .attr("transform", d => `translate(${d.x},${d.y + getCardOffsetY(d.i, expandedIndex)})`);

    linkEl.transition().duration(duration).ease(d3.easeCubicOut)
      .attr("y1", d => {
        const from = layout[d.from];
        return from.y + getCardOffsetY(from.i, expandedIndex) + from.height + 3;
      })
      .attr("y2", d => {
        const to = layout[d.to];
        return to.y + getCardOffsetY(to.i, expandedIndex) - 6;
      });

    if (expandedIndex < 0) {
      if (duration > 0) {
        detailCard.transition().duration(240).ease(d3.easeCubicInOut)
          .attr("opacity", 0)
          .attr("transform", `${detailCard.attr("transform") || "translate(0,0)"} scale(.992)`)
          .on("end", () => detailCard.style("display", "none"));
      } else {
        detailCard.attr("opacity", 0).style("display", "none");
      }
      setFlowViewBox(-1);
      return;
    }

    const step = layout[expandedIndex];
    const targetY = step.y + getCardOffsetY(step.i, expandedIndex) + step.height + detailPanelPad;
    detailCard.style("display", null);
    if (duration > 0) {
      detailCard
        .attr("transform", `translate(${step.x},${targetY + 14}) scale(.992)`)
        .attr("opacity", 0);
      detailCard.transition().duration(duration).ease(d3.easeCubicOut)
        .attr("transform", `translate(${step.x},${targetY}) scale(1)`)
        .attr("opacity", 1);
    } else {
      detailCard.attr("transform", `translate(${step.x},${targetY}) scale(1)`).attr("opacity", 1);
    }
    setFlowViewBox(expandedIndex);
  }

  function setFlowFocus(index = -1) {
    card.transition().duration(220)
      .attr("opacity", d => index < 0 ? 1 : (d.i === index ? 1 : 0.23));
    card.select("rect:nth-child(1)").transition().duration(220)
      .attr("stroke", d => d.i === index ? "rgba(103,232,249,.8)" : "rgba(148,163,184,.22)")
      .attr("stroke-width", d => d.i === index ? 2.1 : 1.3);
    linkEl.transition().duration(220)
      .attr("opacity", d => index < 0 ? 0.88 : (d.from === index || d.to === index ? 1 : 0.12))
      .attr("stroke", d => (d.from === index || d.to === index) ? "rgba(34,211,238,.95)" : "rgba(103,232,249,.35)")
      .attr("stroke-width", d => (d.from === index || d.to === index) ? 2.8 : 1.8);

    if (index < 0) return;
    if (activeFlowIndex < 0) return;
    if (index !== activeFlowIndex) return;

    const step = layout[index];
    detailCard
      .style("display", null)
      .attr("transform", `translate(${step.x},${step.y + step.height + detailPanelPad})`);
    detailTitle.text(step.name);
    const impactLines = wrapTextLines(step.impact, Math.max(26, Math.floor((cardW - 34) / (isMobile ? 6 : 6.6))));
    detailImpact.selectAll("tspan")
      .data(impactLines.map((line, idx) => ({ line, idx })))
      .join("tspan")
      .attr("x", 16)
      .attr("dy", item => item.idx === 0 ? 0 : (isMobile ? 13 : 14))
      .text(item => item.line);
    const techStartY = 46 + (impactLines.length * (isMobile ? 13 : 14)) + 12;
    detailTech.attr("y", techStartY);
    detailTech.selectAll("tspan")
      .data(wrapTextLines(`Tech: ${step.tech.join(" · ")}`, Math.max(24, Math.floor((cardW - 34) / (isMobile ? 6 : 6.6)))).map((line, idx) => ({ line, idx })))
      .join("tspan")
      .attr("x", 16)
      .attr("dy", item => item.idx === 0 ? 0 : (isMobile ? 13 : 14))
      .text(item => item.line);

  }

  let activeFlowIndex = -1;
  let hoverFlowIndex = -1;
  let pinnedFlowIndex = -1;

  const getVisibleFlowIndex = () => (pinnedFlowIndex >= 0 ? pinnedFlowIndex : hoverFlowIndex);

  const syncFlowState = () => {
    activeFlowIndex = getVisibleFlowIndex();
    setFlowFocus(activeFlowIndex);
    applyFlowLayout(activeFlowIndex);
  };

  card.on("mouseenter", (event, d) => {
      if (isMobile) return;
      if (pinnedFlowIndex >= 0) return;
      hoverFlowIndex = d.i;
      syncFlowState();
      triggerFlowCardFx(d.i);
    })
    .on("mouseleave", () => {
      if (isMobile) return;
      if (pinnedFlowIndex >= 0) return;
      hoverFlowIndex = -1;
      syncFlowState();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      pinnedFlowIndex = pinnedFlowIndex === d.i ? -1 : d.i;
      hoverFlowIndex = pinnedFlowIndex >= 0 ? d.i : -1;
      syncFlowState();
      if (pinnedFlowIndex >= 0) triggerFlowCardFx(d.i);
    });

  svg.on("click", () => {
    pinnedFlowIndex = -1;
    hoverFlowIndex = -1;
    syncFlowState();
  });

  const flowTipHtml = t(appState.locale, 'flow_tip', "<span class=\"text-cyan-300 font-bold\">Tip:</span> hover or click a phase to inspect details. Click outside to close.");
  const flowTipTarget = document.getElementById("flow-tip");
  if (flowTipTarget) {
    flowTipTarget.className = "section-tip-contrast mb-4 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300";
    flowTipTarget.innerHTML = flowTipHtml;
  } else {
    const notePanel = document.createElement("div");
    notePanel.className = "section-tip-contrast mt-2 rounded-2xl border border-slate-800 bg-slate-950/78 p-3 text-xs text-slate-300";
    notePanel.innerHTML = flowTipHtml;
    el.appendChild(notePanel);
  }

}

export { dataFlow };


