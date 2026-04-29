import { appState, palette, reducedMotion } from './state.js';
import { safeText } from './utils.js';
import { showTip, hideTip } from './ui.js';
import { renderKeywordsPanel, setActiveLegend, clearActiveLegend } from './render.js';
function bubbles() {
  const el = document.getElementById("bubbles");
  el.innerHTML = "";
  const w = el.clientWidth || 680;
  const isMobile = w < 640;
  const h = isMobile
    ? Math.max(430, Math.round(w * 0.96))
    : Math.max(560, Math.round(w * 0.9));
  const svg = d3.select(el).append("svg").attr("viewBox", [0, 0, w, h]).attr("class", "overflow-hidden");
  const clipId = `bubble-clip-${Math.random().toString(36).slice(2, 9)}`;
  svg.append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", w)
    .attr("height", h);
  const viewport = svg.append("g").attr("clip-path", `url(#${clipId})`);
  const camera = viewport.append("g");
  const hierarchyData = {
    name: "skills",
    children: appState.skillGroups.map(group => ({
      name: group.name,
      level: group.level,
      color: group.color,
      children: (group.keywords || []).map((keyword, index) => ({
        name: keyword.name,
        meta: keyword,
        rank: index + 1,
        total: group.keywords.length,
        value: Math.max(1, group.keywords.length - index)
      }))
    }))
  };

  const root = d3.hierarchy(hierarchyData)
    .sum(d => d.value || 0);

  const pack = d3.pack()
    .size([w - 40, h - 40])
    .padding(isMobile ? 7 : 9);

  const packedRoot = pack(root);

  const groupsData = packedRoot.descendants()
    .filter(d => d.depth === 1)
    .map(d => ({
      name: d.data.name,
      level: d.data.level,
      color: d.data.color,
      x: d.x + 20,
      y: d.y + 20,
      r: d.r
    }));

  const nodes = packedRoot.descendants()
    .filter(d => d.depth === 2)
    .map(d => {
      const parent = d.parent.data;
      const total = d.data.total || 1;
      const index = (d.data.rank || 1) - 1;
      const t = total === 1 ? 1 : index / (total - 1);
      const boost = 1.22 - t * 0.35;
      return {
        name: d.data.name,
        group: parent.name,
        level: parent.level,
        color: parent.color,
        rank: d.data.rank,
        total,
        meta: d.data.meta || { name: d.data.name, level: "", certifications: [], notes: "" },
        x: d.x + 20,
        y: d.y + 20,
        r: Math.max(11, d.r * boost)
      };
    });
  const groupLayer = camera.append("g");
  const nodeLayer = camera.append("g");
  const detailLayer = svg.append("g");
  const groupBubble = groupLayer.selectAll(".group-bubble").data(groupsData).join("g").attr("class", "group-bubble cursor-pointer").attr("transform", d => `translate(${d.x},${d.y})`).on("mouseleave", hideTip).on("click", function(event, d) { event.stopPropagation(); selectGroup(d.name); });
  groupBubble.on("mousemove", (event, d) => {
    const count = appState.skillGroups.find(g => g.name === d.name)?.keywords?.length || 0;
    showTip(event, `<strong>${d.name}</strong><br><small>${d.level}</small><br><small>${count} skills · click to filter</small>`);
  });
  groupBubble.append("circle").attr("r", 1).attr("fill", d => d.color).attr("opacity", 0.12).attr("stroke", d => d.color).attr("stroke-width", 1.5).transition().duration(reducedMotion ? 0 : 900).delay((d, i) => i * 120).ease(d3.easeElasticOut.amplitude(0.8).period(0.5)).attr("r", d => d.r);
  const renderCertsInline = certs => certs.map(cert => {
    if (!cert?.name) return "";
    if (!cert.url) return cert.name;
    return `<a class="text-cyan-300 underline decoration-cyan-500/50 hover:text-cyan-200" href="${cert.url}" target="_blank" rel="noreferrer">${cert.name}</a>`;
  }).filter(Boolean).join(", ");

  const node = nodeLayer.selectAll(".skill-node").data(nodes).join("g").attr("class", "skill-node cursor-pointer").attr("opacity", 0).attr("transform", d => `translate(${d.x},${d.y})`).on("mousemove", (event, d) => {
    const meta = d.meta || { level: "", certifications: [], notes: "" };
    showTip(event, `<small>${d.group}</small>${meta.level ? `<p class="mt-1"><small>Level: ${meta.level}</small></p>` : ""}${meta.certifications?.length ? `<p class="mt-2"><small>Certifications: ${renderCertsInline(meta.certifications)}</small></p>` : ""}${meta.notes ? `<p class="mt-2 text-slate-300">${meta.notes}</p>` : ""}`);
  }).on("mouseleave", hideTip).on("click", function(event, d) { event.stopPropagation(); selectSkill(d); });
  const bubbleFill = color => {
    const c = d3.color(color);
    return c ? c.darker(0.28).formatHex() : color;
  };
  const getLogoList = meta => {
    const raw = meta?.logo;
    if (Array.isArray(raw)) return raw.map(x => safeText(x, "")).filter(Boolean);
    const single = safeText(raw, "");
    return single ? [single] : [];
  };
  const isLogoAsset = value => {
    if (typeof value !== "string") return false;
    const v = value.trim();
    if (!v) return false;
    if (/^https?:\/\//i.test(v)) return true;
    return /^\.?\/?assets\/logos\/.+\.(svg|png|webp|avif)$/i.test(v) || /^\.\/assets\/logos\/.+$/i.test(v);
  };
  const getBubbleText = d => {
    const logos = getLogoList(d.meta);
    if (logos.length === 1 && !isLogoAsset(logos[0])) return logos[0];
    return `${fitLabel(d)}${d.meta?.certifications?.length ? " •" : ""}`;
  };
  const fitLabel = d => {
    const maxChars = Math.max(4, Math.floor(d.r * (isMobile ? 0.7 : 0.76)));
    const baseName = d.name.replace(/\*+\s*$/, "");
    if (baseName.length <= maxChars) return baseName;
    if (maxChars <= 4) return d.name.slice(0, maxChars);
    return `${baseName.slice(0, maxChars - 1)}…`;
  };
  const fitFontSize = d => {
    const label = fitLabel(d);
    const sizeByRadius = d.r * (isMobile ? 0.34 : 0.38);
    const sizeByLength = (d.r * (isMobile ? 1.45 : 1.62)) / Math.max(5, label.length);
    return Math.max(isMobile ? 6.2 : 7, Math.min(isMobile ? 10 : 11.5, sizeByRadius, sizeByLength * 2.05));
  };

  node.append("circle").attr("class", "bubble").attr("r", d => reducedMotion ? d.r : 1).attr("fill", d => bubbleFill(d.color)).attr("opacity", 0.9).attr("stroke", "rgba(255,255,255,.42)").attr("stroke-width", 1);
  node.filter(d => {
      const logos = getLogoList(d.meta);
      return logos.length === 0 || (logos.length === 1 && !isLogoAsset(logos[0]));
    }).append("text")
    .attr("text-anchor", "middle")
    .attr("dy", ".3em")
    .attr("fill", "white")
    .attr("font-weight", 700)
    .attr("letter-spacing", isMobile ? ".01em" : ".005em")
    .attr("paint-order", "stroke")
    .attr("stroke", "rgba(2,6,23,.35)")
    .attr("stroke-width", isMobile ? 0.7 : 0.5)
    .attr("font-size", d => fitFontSize(d))
    .text(d => getBubbleText(d));
  const logoNode = node.filter(d => getLogoList(d.meta).some(isLogoAsset));
  logoNode.each(function(d) {
    const group = d3.select(this);
    const logos = getLogoList(d.meta).filter(isLogoAsset).slice(0, 4);
    if (!logos.length) return;
    if (logos.length === 1) {
      const size = Math.max(14, Math.min(isMobile ? 34 : 38, d.r * 1.05));
      group.append("image")
        .attr("href", logos[0])
        .attr("x", -size / 2)
        .attr("y", -size / 2)
        .attr("width", size)
        .attr("height", size)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("filter", "drop-shadow(0 1px 3px rgba(2,6,23,.55))")
        .style("pointer-events", "none");
      return;
    }
    const cell = Math.max(10, Math.min(isMobile ? 15 : 17, d.r * 0.55));
    const gap = Math.max(2, Math.round(cell * 0.22));
    const total = cell * 2 + gap;
    logos.forEach((logo, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = -total / 2 + col * (cell + gap);
      const y = -total / 2 + row * (cell + gap);
      group.append("image")
        .attr("href", logo)
        .attr("x", x)
        .attr("y", y)
        .attr("width", cell)
        .attr("height", cell)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("filter", "drop-shadow(0 1px 2px rgba(2,6,23,.5))")
        .style("pointer-events", "none");
    });
  });
  node.transition().duration(reducedMotion ? 0 : 700).delay((d, i) => i * 35).attr("opacity", 1);
  node.select("circle").transition().duration(reducedMotion ? 0 : 900).delay((d, i) => i * 35).ease(d3.easeElasticOut.amplitude(.8).period(.45)).attr("r", d => d.r);
  let hasInteracted = false;
  const initialTipHTML = `<div class="rounded-2xl border border-slate-800 bg-slate-950/85 p-4 text-sm text-slate-300"><strong class="text-cyan-300">Tip:</strong> click a category, a large bubble, or a skill to filter and highlight technologies.</div>`;
  const detail = detailLayer.append("foreignObject").attr("x", 20).attr("y", h - 104).attr("width", w - 40).attr("height", 96).html(initialTipHTML);
  const hideInitialTip = () => {
    if (hasInteracted) return;
    hasInteracted = true;
    detail.remove();
  };

  const maxScale = isMobile ? 3 : 3.5;
  const viewState = { cx: w / 2, cy: h / 2, width: w };
  const clampView = (cx, cy, width) => {
    const k = Math.max(1, Math.min(maxScale, w / width));
    const viewW = w / k;
    const viewH = h / k;
    const halfW = viewW / 2;
    const halfH = viewH / 2;
    return {
      k,
      width: viewW,
      cx: Math.max(halfW, Math.min(w - halfW, cx)),
      cy: Math.max(halfH, Math.min(h - halfH, cy))
    };
  };
  const toTransform = (cx, cy, width) => {
    const v = clampView(cx, cy, width);
    return d3.zoomIdentity
      .translate(w / 2 - v.cx * v.k, h / 2 - v.cy * v.k)
      .scale(v.k);
  };
  const applyStateFromTransform = transform => {
    const k = transform.k || 1;
    viewState.width = w / k;
    viewState.cx = (w / 2 - transform.x) / k;
    viewState.cy = (h / 2 - transform.y) / k;
  };

  const zoomBehavior = d3.zoom()
    .scaleExtent([1, maxScale])
    .extent([[0, 0], [w, h]])
    .translateExtent([[0, 0], [w, h]])
    .wheelDelta(event => {
      const base = isMobile ? 0.0008 : 0.0013;
      return -event.deltaY * (event.deltaMode === 1 ? 0.028 : event.deltaMode ? 0.55 : base) * (event.ctrlKey ? 6 : 1);
    })
    .on("zoom", event => {
      camera.attr("transform", event.transform);
      applyStateFromTransform(event.transform);
    });

  svg.call(zoomBehavior).on("dblclick.zoom", null);
  if (isMobile) {
    svg
      .style("touch-action", "manipulation")
      .on("touchstart", event => {
        if (event.touches && event.touches.length > 1) return;
        event.stopPropagation();
      });
  }

  const nodesForBounds = [...groupsData, ...nodes];
  const minX = d3.min(nodesForBounds, d => d.x - d.r) ?? 0;
  const maxX = d3.max(nodesForBounds, d => d.x + d.r) ?? w;
  const minY = d3.min(nodesForBounds, d => d.y - d.r) ?? 0;
  const maxY = d3.max(nodesForBounds, d => d.y + d.r) ?? h;
  const boundsW = Math.max(1, maxX - minX);
  const boundsH = Math.max(1, maxY - minY);
  const fitPad = isMobile ? 0.985 : 0.92;
  const fitScale = Math.max(1, Math.min(maxScale, Math.min((w / boundsW) * fitPad, (h / boundsH) * fitPad)));
  const initialScale = fitScale;
  const fitCx = minX + boundsW / 2;
  const fitCy = minY + boundsH / 2;
  const initialTransform = d3.zoomIdentity
    .translate(w / 2 - fitCx * initialScale, h / 2 - fitCy * initialScale)
    .scale(initialScale);
  svg.call(zoomBehavior.transform, initialTransform);

  const zoomTo = target => {
    const t = toTransform(target[0], target[1], target[2]);
    svg.transition()
      .duration(reducedMotion ? 0 : 720)
      .ease(d3.easeSinInOut)
      .call(zoomBehavior.transform, t, [w / 2, h / 2]);
  };

  const zoomToGroup = groupName => {
    const g = groupsData.find(item => item.name === groupName);
    if (!g) return;
    const maxZoomWidth = w / maxScale;
    const size = Math.max(maxZoomWidth, g.r * 2.1 + (isMobile ? 42 : 56));
    zoomTo([g.x, g.y, size]);
  };

  const highlightKeywordChip = (groupName, keyword) => {
    document.querySelectorAll("#skill-keywords .keyword-chip").forEach(chip => {
      const isActive = chip.dataset.group === groupName && chip.dataset.keyword === keyword;
      chip.classList.toggle("active", isActive);
    });
  };

  const bindKeywordChipEvents = () => {
    document.querySelectorAll("#skill-keywords .keyword-chip").forEach(chip => {
      chip.addEventListener("click", event => {
        event.stopPropagation();
        hideInitialTip();
        const targetGroup = chip.dataset.group;
        const targetKeyword = chip.dataset.keyword;
        const targetNode = nodes.find(nodeItem => nodeItem.group === targetGroup && nodeItem.name === targetKeyword);
        if (targetNode) selectSkill(targetNode);
      });
    });
  };

  function selectGroup(groupName) {
    const group = appState.skillGroups.find(g => g.name === groupName);
    if (!group) return;
    hideInitialTip();
    setActiveLegend(groupName);
    renderKeywordsPanel(group, "");
    bindKeywordChipEvents();
    highlightKeywordChip("", "");
    zoomToGroup(groupName);
    node.transition().duration(350).attr("opacity", d => d.group === groupName ? 1 : 0.05);
    node.select("circle").transition().duration(350).attr("stroke-width", d => d.group === groupName ? 3 : 1).attr("r", d => d.group === groupName ? d.r + 4 : d.r * 0.92);
    groupBubble.select("circle").transition().duration(350).attr("opacity", d => d.name === groupName ? 0.26 : 0.06).attr("stroke-width", d => d.name === groupName ? 3 : 1.5);
  }
  function selectSkill(skill) {
    hideInitialTip();
    setActiveLegend(skill.group);
    renderKeywordsPanel(appState.skillGroups.find(g => g.name === skill.group), skill.name);
    bindKeywordChipEvents();
    highlightKeywordChip(skill.group, skill.name);
    zoomToGroup(skill.group);
    node.transition().duration(350).attr("opacity", d => d.name === skill.name ? 1 : d.group === skill.group ? 0.22 : 0.05);
    node.select("circle").transition().duration(350).attr("stroke-width", d => d.name === skill.name ? 4 : 1).attr("r", d => d.name === skill.name ? d.r + 8 : d.r);
    groupBubble.select("circle").transition().duration(350).attr("opacity", d => d.name === skill.group ? 0.24 : 0.06).attr("stroke-width", d => d.name === skill.group ? 3 : 1.5);
  }
  function resetSelection() {
    clearActiveLegend();
    renderKeywordsPanel(null);
    zoomTo([fitCx, fitCy, w / initialScale]);
    node.transition().duration(350).attr("opacity", 1);
    node.select("circle").transition().duration(350).attr("stroke-width", 1).attr("r", d => d.r);
    groupBubble.select("circle").transition().duration(350).attr("opacity", 0.12).attr("stroke-width", 1.5);
  }

  node.attr("transform", d => `translate(${d.x},${d.y})`);
  if (isMobile) {
    node.select("circle").attr("stroke-width", 0.8);
  }
  document.querySelectorAll(".skill-filter").forEach(button => { button.addEventListener("click", () => selectGroup(button.dataset.group)); });
  svg.on("click", () => { hideInitialTip(); resetSelection(); });
}

export { bubbles };
