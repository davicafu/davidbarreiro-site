import { appState, CURRENT_YEAR, categoryColorMap, palette, reducedMotion } from './state.js';
import { safeText, normalizeKeywordItem, parseDateToYear, deriveFlow } from './utils.js';
function mapResumeToViewModel(data) {
  const basics = data.basics || {};
  const work = Array.isArray(data.work) ? data.work : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const portfolio = Array.isArray(data.portfolio) ? data.portfolio : [];

  const workItems = work.map(entry => ({
    company: safeText(entry.name, "Empresa"),
    role: safeText(entry.position, "Software Engineer"),
    start: parseDateToYear(entry.startDate, CURRENT_YEAR - 1),
    end: parseDateToYear(entry.endDate, CURRENT_YEAR),
    text: safeText(entry.summary, "Contributions to data platform initiatives."),
    highlights: Array.isArray(entry.highlights) ? entry.highlights.filter(Boolean) : [],
    tech: Array.isArray(entry.tech) ? entry.tech.filter(Boolean) : [],
    type: "work"
  }));
  const educationItems = education.map(entry => ({
    company: safeText(entry.institution, "Institution"),
    role: safeText(entry.studyType, "Education"),
    start: parseDateToYear(entry.startDate, CURRENT_YEAR - 1),
    end: parseDateToYear(entry.endDate, CURRENT_YEAR),
    text: safeText(entry.area, "Academic program"),
    highlights: [],
    tech: Array.isArray(entry.tech) && entry.tech.length
      ? entry.tech.filter(Boolean)
      : ["Education", safeText(entry.studyType, "Degree"), safeText(entry.area, "Program")].filter(Boolean),
    type: "education"
  }));

  appState.jobs = [...workItems, ...educationItems].sort((a, b) => a.start - b.start);

  appState.skillGroups = skills.map((entry, i) => {
    const name = safeText(entry.name, `Skill Group ${i + 1}`);
    const key = name.toLowerCase().trim();
    return {
      name,
      level: safeText(entry.level, "Intermediate"),
      color: categoryColorMap[key] || palette[i % palette.length],
      keywords: Array.isArray(entry.keywords) ? entry.keywords.map(normalizeKeywordItem) : []
    };
  });

  appState.flow = deriveFlow(appState.skillGroups);
  return { basics, portfolio };
}

function renderHeader(basics) {
  const fullName = safeText(basics.name, "David Barreiro Salgueiro").split(" ");
  const firstName = fullName.shift() || "David";
  const surname = fullName.join(" ") || "Barreiro Salgueiro";

  const kicker = document.getElementById("hero-kicker");
  const nameEl = document.getElementById("hero-name");
  const surnameEl = document.getElementById("hero-surname");
  const summary = document.getElementById("hero-summary");
  const ctaMail = document.getElementById("hero-email-link");
  const githubLink = document.getElementById("hero-github-link");
  const linkedinLink = document.getElementById("hero-linkedin-link");
  const profileImage = document.querySelector("aside img");

  if (kicker) kicker.textContent = `${safeText(basics.label, "Senior Software Engineer | Distributed Systems · Data Platforms · Streaming")}`;
  if (nameEl) nameEl.textContent = firstName;
  if (surnameEl) surnameEl.textContent = surname;
  if (summary) summary.textContent = safeText(basics.summary, "I build real-time data platforms and deliver pragmatic solutions for complex systems.");

  if (profileImage) {
    profileImage.alt = safeText(basics.name, "Profile");
    const profiles = Array.isArray(basics.profiles) ? basics.profiles : [];
    const githubProfile = profiles.find(p => safeText(p.network).toLowerCase().includes("github"))?.url || "";
    const githubUser = githubProfile ? githubProfile.replace(/\/+$/,"").split("/").pop() : "";
    const githubAvatar = githubUser ? `https://github.com/${githubUser}.png` : "";
    const primaryImage = safeText(basics.image, "");
    let triedGithubFallback = false;
    profileImage.onerror = function() {
      if (!triedGithubFallback && githubAvatar) {
        triedGithubFallback = true;
        this.src = githubAvatar;
        return;
      }
      this.onerror = null;
      this.src = "./favicon.ico";
      this.className = "w-28 h-28 rounded-[1.7rem] object-contain p-2 bg-white/5 mb-7 border border-white/20";
    };
    profileImage.src = primaryImage || githubAvatar;
  }

  const email = safeText(basics.email, "david.barreiro@outlook.es");
  if (ctaMail) ctaMail.href = `mailto:${email}`;

  const contactSectionMail = document.querySelector("#contact a[href^='mailto:']");
  if (contactSectionMail) { contactSectionMail.href = `mailto:${email}`; contactSectionMail.textContent = email; }

  const profiles = Array.isArray(basics.profiles) ? basics.profiles : [];
  const github = profiles.find(p => safeText(p.network).toLowerCase().includes("github"));
  const linkedin = profiles.find(p => safeText(p.network).toLowerCase().includes("linkedin"));
  if (github?.url && githubLink) githubLink.href = github.url;
  if (linkedin?.url && linkedinLink) linkedinLink.href = linkedin.url;
}

function renderMetrics(basics = {}, meta = {}) {
  const cards = document.querySelectorAll("aside .metric-card .counter");
  const focus = document.querySelector("aside .col-span-2 .font-bold");
  const workJobs = appState.jobs.filter(j => j.type !== 'education');
  const firstStart = workJobs.length ? Math.min(...workJobs.map(j => j.start)) : CURRENT_YEAR;
  const years = Math.max(1, Math.round(CURRENT_YEAR - firstStart));
  const stacks = appState.skillGroups.length;
  //const topFocus = safeText(basics.focus, safeText(meta.focus, "Data Engineering"));
  if (cards[0]) cards[0].dataset.target = years;
  if (cards[1]) cards[1].dataset.target = stacks;
  //if (focus) focus.textContent = topFocus;
}

function renderProjects(portfolio) {
  const grid = document.querySelector("#portfolio .grid");
  if (!grid) return;
  const list = (portfolio && portfolio.length ? portfolio : []).slice(0, 8);
  if (!list.length) {
    grid.innerHTML = `<article class=\"glass rounded-[2rem] p-7 border border-slate-800\"><h3 class=\"text-xl font-black mb-3\">Portfolio in progress</h3><p class=\"text-slate-400 leading-relaxed\">Project entries will appear here once <code>portfolio</code> is defined in <code>resume.json</code>.</p></article>`;
    return;
  }
  grid.innerHTML = list.map((project, index) => {
    const tags = (project.highlights || []).slice(0, 3);
    const borderClass = index % 2 === 0 ? "hover:border-cyan-300/60" : "hover:border-violet-300/60";
    const chipClass = index % 2 === 0 ? "bg-cyan-300/10 text-cyan-200" : "bg-violet-300/10 text-violet-200";
    return `<article class=\"glass rounded-[2rem] p-7 hover:-translate-y-2 ${borderClass} transition duration-300\"><h3 class=\"text-2xl font-black mb-3\">${safeText(project.name, "Project")}</h3><p class=\"text-slate-400 leading-relaxed\">${safeText(project.description, "Technical personal project.")}</p><div class=\"flex flex-wrap gap-2 mt-5\">${tags.map(tag => `<span class=\"px-3 py-1 rounded-full ${chipClass} text-sm\">${safeText(typeof tag === "string" ? tag : (tag?.text || tag?.name || "")).slice(0, 38)}</span>`).join("")}</div></article>`;
  }).join("");
}

function revealOnScroll() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("visible"); }); }, { threshold: .15 });
  items.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i * 70, 280)}ms`; observer.observe(el); });
}

function counters() {
  const els = document.querySelectorAll(".counter");
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.dataset.target;
      if (reducedMotion) { el.textContent = target + "+"; return; }
      d3.select(el).transition().duration(1100).tween("text", function() { const i = d3.interpolateNumber(0, target); return t => this.textContent = Math.round(i(t)) + "+"; });
      obs.unobserve(el);
    });
  });
  els.forEach(el => obs.observe(el));
}

function spotlight() {
  const s = document.getElementById("spotlight");
  if (!s) return;
  const desktop = window.matchMedia("(min-width: 1024px)").matches;
  if (desktop) {
    s.style.left = "22%";
    s.style.top = "18%";
    s.style.opacity = "0.6";
    return;
  }
  s.style.opacity = "1";
  window.addEventListener("mousemove", e => {
    s.style.left = e.clientX + "px";
    s.style.top = e.clientY + "px";
  });
}

function renderLegend() {
  const root = document.getElementById("legend");
  root.innerHTML = appState.skillGroups.map(group => `<button type=\"button\" class=\"skill-filter inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-slate-800 text-sm text-slate-300 hover:border-cyan-300 transition\" data-group=\"${group.name}\"><span class=\"w-2.5 h-2.5 rounded-full\" style=\"background:${group.color}\"></span>${group.name}</button>`).join("");
}

function setActiveLegend(groupName) { document.querySelectorAll(".skill-filter").forEach(button => { button.classList.toggle("active", button.dataset.group === groupName); }); }
function clearActiveLegend() { document.querySelectorAll(".skill-filter").forEach(button => { button.classList.remove("active"); }); }

function renderKeywordsPanel(group, selectedKeywordName = "") {
  const panel = document.getElementById("skill-keywords");
  if (!panel) return;
  if (!group) {
    panel.innerHTML = `<strong class="text-cyan-300">Tip:</strong> select a category to view its keywords.`;
    return;
  }

  const selected = group.keywords.find(k => k.name === selectedKeywordName);
  const renderCerts = certs => certs.map(cert => {
    if (!cert?.name) return "";
    if (!cert.url) return cert.name;
    return `<a class="text-cyan-300 underline decoration-cyan-500/50 hover:text-cyan-200" href="${cert.url}" target="_blank" rel="noreferrer">${cert.name}</a>`;
  }).filter(Boolean).join(", ");

  const detail = selected ? `
    <div class="mt-4 rounded-xl border border-slate-800 bg-slate-950/65 p-3 text-xs text-slate-300">
      ${selected.level ? `<p class="text-slate-400 mt-1">Level: <span class="text-slate-200">${selected.level}</span></p>` : ""}
      ${selected.certifications.length ? `<p class="text-slate-400 mt-1">Certifications: <span class="text-slate-200">${renderCerts(selected.certifications)}</span></p>` : ""}
      ${selected.notes ? `<p class="text-slate-400 mt-2">${selected.notes}</p>` : ""}
    </div>
  ` : "";

  panel.innerHTML = `
    <div class="flex items-center gap-2 mb-3">
      <span class="w-3 h-3 rounded-full" style="background:${group.color}"></span>
      <strong class="text-white">${group.name}</strong>
      <span class="text-slate-500">· ${group.level}</span>
    </div>
    <div class="flex flex-wrap gap-2">
      ${group.keywords.map(k => `<button type="button" data-group="${group.name}" data-keyword="${k.name}" class="keyword-chip px-2 py-1 rounded-full bg-white/5 border border-slate-800 hover:border-cyan-300/70 transition">${k.name}${k.certifications?.length ? '<span class="cert-badge">CERT</span>' : ""}</button>`).join("")}
    </div>
    ${detail}
  `;
}

export {
  mapResumeToViewModel,
  renderHeader,
  renderMetrics,
  renderProjects,
  revealOnScroll,
  counters,
  spotlight,
  renderLegend,
  setActiveLegend,
  clearActiveLegend,
  renderKeywordsPanel
};
