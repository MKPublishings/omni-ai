(() => {
  const statsEntries = document.getElementById("codex-stat-entries");
  const statsLinks = document.getElementById("codex-stat-links");
  const statsChambers = document.getElementById("codex-stat-chambers");
  const statsGenerated = document.getElementById("codex-stat-generated");
  const statsAuto = document.getElementById("codex-stat-auto");
  const chamberButtonsRoot = document.getElementById("codex-chamber-buttons");
  const graphInsightRoot = document.getElementById("codex-graph-insight");
  const entryListRoot = document.getElementById("codex-entry-list");
  const searchInput = document.getElementById("codex-search");
  const resultCount = document.getElementById("codex-result-count");
  const autoToggle = document.getElementById("codex-auto-toggle");
  const refreshBtn = document.getElementById("codex-refresh-btn");
  const autoStatus = document.getElementById("codex-auto-status");

  const AUTO_REFRESH_MS = 45000;

  const AUTO_CODEX_STATIC = {
    categories: [
      { id: "automation.pipelines", path: "automation/pipelines" },
      { id: "governance.policies", path: "governance/policies" },
      { id: "integrations.workers", path: "integrations/workers" },
      { id: "site.pages", path: "site/pages" },
      { id: "site.modules", path: "site/modules" },
      { id: "site.declarations", path: "site/declarations" },
      { id: "releases.public", path: "releases/public" },
      { id: "systems.environment", path: "systems/environment" },
      { id: "integrations.docs", path: "integrations/docs" }
    ],
    entries: [
      {
        id: "automation.codex.reindex",
        path: "scripts/codex/reindex.js",
        title: "Codex Reindex Orchestrator",
        type: "automation",
        category: "automation/pipelines",
        tags: ["automation", "codex", "orchestrator", "reindex"],
        links: ["system.ION.overview", "legacy.codex.10-architecture"],
        autoLinks: ["automation.codex.web-mirror-sync", "automation.codex.watch"],
        lineage: ["legacy.codex.50-mind-path-map"]
      },
      {
        id: "automation.codex.watch",
        path: "scripts/codex/watch.js",
        title: "Codex Watch Runtime",
        type: "automation",
        category: "automation/pipelines",
        tags: ["automation", "codex", "watch", "live-update"],
        links: ["automation.codex.reindex", "automation.codex.register"],
        autoLinks: ["automation.codex.web-mirror-sync"]
      },
      {
        id: "automation.codex.register",
        path: "scripts/codex/registerArtifact.js",
        title: "Codex Artifact Registrar",
        type: "automation",
        category: "automation/pipelines",
        tags: ["automation", "codex", "register", "artifact"],
        links: ["automation.codex.reindex", "legacy.codex.00-index"],
        autoLinks: []
      },
      {
        id: "automation.codex.web-mirror-sync",
        path: "public/codex-index.json",
        title: "Codex Web Mirror Sync",
        type: "automation",
        category: "automation/pipelines",
        tags: ["automation", "web", "mirror", "index"],
        links: ["automation.codex.reindex", "legacy.codex.00-index"],
        autoLinks: []
      },
      {
        id: "governance.legal.responsible-use",
        path: "public/legal.html",
        title: "Responsible Use Legal Notice",
        type: "policy",
        category: "governance/policies",
        tags: ["legal", "policy", "jurisdiction", "truthfulness"],
        links: ["governance.safety.attestation-flow"],
        autoLinks: ["system.ION.guardrails"]
      },
      {
        id: "governance.safety.attestation-flow",
        path: "public/scripts/chat.js",
        title: "Attestation + Safety Enforcement Flow",
        type: "policy-runtime",
        category: "governance/policies",
        tags: ["safety", "attestation", "age-gate", "jurisdiction"],
        links: ["governance.legal.responsible-use", "system.ION.guardrails"],
        autoLinks: []
      },
      {
        id: "governance.legal.notice-page",
        path: "public/legal.html",
        title: "Ionirix Legal Notice Page",
        type: "policy-page",
        category: "governance/policies",
        tags: ["legal", "responsible-use", "liability", "terms"],
        links: ["governance.legal.responsible-use", "site.page.about"],
        autoLinks: ["governance.safety.attestation-flow"]
      },
      {
        id: "integrations.workers.routing-mesh",
        path: "workers/ION-ai/src/index.ts",
        title: "Worker Routing Mesh",
        type: "integration",
        category: "integrations/workers",
        tags: ["workers", "routing", "api", "edge"],
        links: ["system.ION.overview", "system.mind-os.runtime-loop"],
        autoLinks: []
      },
      {
        id: "integrations.workers.router-gateway",
        path: "workers/ION-ai-router/src/index.ts",
        title: "Router Worker Gateway",
        type: "integration",
        category: "integrations/workers",
        tags: ["workers", "router", "gateway", "edge"],
        links: ["integrations.workers.routing-mesh", "site.page.chat"],
        autoLinks: []
      },
      {
        id: "integrations.workers.images-worker",
        path: "workers/ION-ai-images/src/index.ts",
        title: "Images Worker",
        type: "integration",
        category: "integrations/workers",
        tags: ["workers", "image", "generation", "edge"],
        links: ["integrations.media.pipeline-fabric", "system.ION.image-engine"],
        autoLinks: []
      },
      {
        id: "integrations.media.pipeline-fabric",
        path: "ION_media/pipeline.py",
        title: "Media Pipeline Fabric",
        type: "integration",
        category: "integrations/workers",
        tags: ["media", "pipeline", "image"],
        links: ["system.ION.overview", "governance.safety.attestation-flow"],
        autoLinks: []
      },
      {
        id: "integrations.docs.implementation-guide",
        path: "IMPLEMENTATION-GUIDE.md",
        title: "Environment Mode Implementation Guide",
        type: "integration-doc",
        category: "integrations/docs",
        tags: ["environment", "implementation", "guide", "ionirix"],
        links: ["system.environment.engine", "site.page.modes"],
        autoLinks: ["system.environment.types"]
      },
      {
        id: "system.environment.types",
        path: "src/modes/environment/types/environment.types.ts",
        title: "Environment Mode Types",
        type: "system-module",
        category: "systems/environment",
        tags: ["environment", "types", "simulation", "mode"],
        links: ["system.environment.engine", "site.page.modes"],
        autoLinks: []
      },
      {
        id: "system.environment.engine",
        path: "src/modes/environment/core/environment-engine.ts",
        title: "Environment Engine Core",
        type: "system-module",
        category: "systems/environment",
        tags: ["environment", "engine", "simulation", "orchestrator"],
        links: ["system.environment.scale-manager", "system.environment.earth-initializer"],
        autoLinks: ["integrations.docs.implementation-guide"]
      },
      {
        id: "system.environment.scale-manager",
        path: "src/modes/environment/core/scale-manager.ts",
        title: "Environment Scale Manager",
        type: "system-module",
        category: "systems/environment",
        tags: ["environment", "scale", "planetary", "hierarchy"],
        links: ["system.environment.engine"],
        autoLinks: []
      },
      {
        id: "system.environment.earth-initializer",
        path: "src/modes/environment/core/earth-initializer.ts",
        title: "Environment Earth Initializer",
        type: "system-module",
        category: "systems/environment",
        tags: ["environment", "earth", "seed", "regions"],
        links: ["system.environment.engine", "system.environment.scale-manager"],
        autoLinks: []
      },
      {
        id: "site.module.simulation-capabilities",
        path: "public/modules/simulation-capabilities.md",
        title: "Simulation Capabilities Module",
        type: "site-module",
        category: "site/modules",
        tags: ["site", "module", "simulation", "capabilities"],
        links: ["system.environment.engine", "system.ION.quantum-cognitive-sim"],
        autoLinks: []
      },
      {
        id: "site.module.anatomy-capabilities",
        path: "public/modules/anatomy-capabilities.md",
        title: "Anatomy Capabilities Module",
        type: "site-module",
        category: "site/modules",
        tags: ["site", "module", "anatomy", "capabilities"],
        links: ["system.ION.overview", "site.page.about"],
        autoLinks: []
      },
      {
        id: "site.module.system-rules",
        path: "public/modules/system-rules.md",
        title: "System Rules Module",
        type: "site-module",
        category: "site/modules",
        tags: ["site", "module", "rules", "governance"],
        links: ["governance.legal.responsible-use", "system.ION.overview"],
        autoLinks: []
      },
      {
        id: "site.declaration.ionirix",
        path: "public/ionirix-declaration.md",
        title: "Ionirix Public Declaration",
        type: "declaration",
        category: "site/declarations",
        tags: ["declaration", "ionirix", "public-profile", "lineage"],
        links: ["release.ionirix.public", "system.ION.intelligence-lineage"],
        autoLinks: []
      },
      {
        id: "site.declaration.ION-alias",
        path: "public/ION-ai-declaration.md",
        title: "ION Ai Declaration Alias",
        type: "declaration",
        category: "site/declarations",
        tags: ["declaration", "alias", "ionirix", "ION"],
        links: ["site.declaration.ionirix", "release.ION.public"],
        autoLinks: []
      },
      {
        id: "release.ionirix.public",
        path: "public/ionirix-release.json",
        title: "Ionirix Public Release Spec",
        type: "release-spec",
        category: "releases/public",
        tags: ["release", "ionirix", "spec", "public"],
        links: ["site.declaration.ionirix", "system.ION.intelligence-lineage"],
        autoLinks: []
      },
      {
        id: "release.ION.public",
        path: "public/ION-ai-release.json",
        title: "ION Ai Public Release Spec",
        type: "release-spec",
        category: "releases/public",
        tags: ["release", "ION", "spec", "public"],
        links: ["release.ionirix.public", "site.declaration.ION-alias"],
        autoLinks: []
      }
    ],
    crossLinks: [
      { source: "automation.codex.reindex", target: "automation.codex.web-mirror-sync", reason: "automation-flow", score: 0.98 },
      { source: "automation.codex.reindex", target: "legacy.codex.10-architecture", reason: "lineage-anchor", score: 0.84 },
      { source: "automation.codex.watch", target: "automation.codex.reindex", reason: "sync-loop", score: 0.91 },
      { source: "automation.codex.register", target: "automation.codex.reindex", reason: "artifact-registration", score: 0.89 },
      { source: "governance.legal.responsible-use", target: "governance.safety.attestation-flow", reason: "policy-enforcement", score: 0.96 },
      { source: "integrations.workers.routing-mesh", target: "integrations.media.pipeline-fabric", reason: "runtime-integration", score: 0.87 },
      { source: "integrations.media.pipeline-fabric", target: "governance.safety.attestation-flow", reason: "safety-constraint", score: 0.82 },
      { source: "system.environment.engine", target: "system.environment.types", reason: "engine-contract", score: 0.94 },
      { source: "system.environment.engine", target: "system.environment.scale-manager", reason: "orchestration", score: 0.92 },
      { source: "system.environment.engine", target: "system.environment.earth-initializer", reason: "seed-initialization", score: 0.9 },
      { source: "site.declaration.ionirix", target: "release.ionirix.public", reason: "release-attestation", score: 0.95 },
      { source: "site.declaration.ION-alias", target: "release.ION.public", reason: "release-attestation", score: 0.93 },
      { source: "site.module.simulation-capabilities", target: "system.environment.engine", reason: "capability-alignment", score: 0.88 },
      { source: "site.module.system-rules", target: "governance.legal.responsible-use", reason: "rules-to-policy", score: 0.86 },
      { source: "integrations.docs.implementation-guide", target: "system.environment.engine", reason: "implementation-lineage", score: 0.89 }
    ]
  };

  const KNOWN_SITE_ROUTES = [
    "/index.html",
    "/chat.html",
    "/codex.html",
    "/modes.html",
    "/settings.html",
    "/about.html",
    "/legal.html",
    "/memory.html",
    "/system.html",
    "/tools.html"
  ];

  const state = {
    index: null,
    selectedChamber: "all",
    search: "",
    autoCodexEnabled: true,
    autoRefreshMs: AUTO_REFRESH_MS,
    timer: null,
    isLoading: false,
    autoArtifactCount: 0
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(isoDate) {
    if (!isoDate) return "--";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString();
  }

  function toChamber(entry) {
    const category = String(entry?.category || "unknown");
    return category.split("/")[0] || "unknown";
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getEntries() {
    return Array.isArray(state.index?.entries) ? state.index.entries : [];
  }

  function getCrossLinks() {
    return Array.isArray(state.index?.crossLinks) ? state.index.crossLinks : [];
  }

  function getChamberCounts(entries) {
    const counts = new Map();
    for (const entry of entries) {
      const chamber = toChamber(entry);
      counts.set(chamber, (counts.get(chamber) || 0) + 1);
    }
    return counts;
  }

  function sortEntries(entries) {
    return [...entries].sort((a, b) => {
      const left = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const right = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return right - left;
    });
  }

  function filterEntries(entries) {
    const chamber = state.selectedChamber;
    const query = state.search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (chamber !== "all" && toChamber(entry) !== chamber) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        entry.id,
        entry.title,
        entry.path,
        entry.category,
        entry.type,
        ...(entry.tags || []),
        ...(entry.links || []),
        ...(entry.autoLinks || [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  function normalizeSiteRoutePath(pathname) {
    const clean = String(pathname || "").trim().replace(/\/+$/, "") || "/";
    if (clean === "/") return "/index.html";
    return clean.endsWith(".html") ? clean : `${clean}.html`;
  }

  function toRouteKey(pathname) {
    const normalized = normalizeSiteRoutePath(pathname).replace(/\.html$/, "");
    const parts = normalized.split("/").filter(Boolean);
    return parts[parts.length - 1] || "index";
  }

  function titleFromRouteKey(routeKey) {
    const label = String(routeKey || "").replace(/[-_]+/g, " ").trim();
    if (!label) return "Home";
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function discoverSiteArtifacts() {
    const links = Array.from(document.querySelectorAll(".nav .nav-link[href]"));
    const uniquePaths = new Set();

    for (const path of KNOWN_SITE_ROUTES) {
      uniquePaths.add(normalizeSiteRoutePath(path));
    }

    for (const link of links) {
      const href = String(link.getAttribute("href") || "").trim();
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) continue;
      uniquePaths.add(normalizeSiteRoutePath(url.pathname));
    }

    const timestamp = nowIso();
    const entries = [];
    const crossLinks = [];

    for (const path of uniquePaths) {
      const routeKey = toRouteKey(path);
      const routeTitle = titleFromRouteKey(routeKey);
      const id = `site.page.${routeKey}`;

      const linksOut = ["automation.codex.reindex", "system.ION.overview"];
      if (routeKey === "legal") {
        linksOut.push("governance.legal.responsible-use");
      }
      if (routeKey === "chat") {
        linksOut.push("governance.safety.attestation-flow");
      }
      if (routeKey === "modes") {
        linksOut.push("system.environment.engine", "system.environment.types");
      }
      if (routeKey === "about") {
        linksOut.push("site.declaration.ionirix", "release.ionirix.public");
      }
      if (routeKey === "tools" || routeKey === "system") {
        linksOut.push("integrations.workers.routing-mesh", "integrations.media.pipeline-fabric");
      }
      if (routeKey === "memory") {
        linksOut.push("system.mind-os.memory-ring");
      }

      entries.push({
        id,
        path: `public${path}`,
        title: `${routeTitle} Page Route`,
        type: "site-page",
        category: "site/pages",
        tags: ["site", "page", routeKey],
        links: linksOut,
        autoLinks: [],
        lineage: ["legacy.codex.00-index"],
        createdAt: timestamp,
        updatedAt: timestamp
      });

      crossLinks.push(
        {
          source: id,
          target: "automation.codex.reindex",
          reason: "site-route-hydration",
          score: 0.73
        },
        {
          source: id,
          target: routeKey === "legal" ? "governance.legal.responsible-use" : "system.ION.overview",
          reason: "site-route-context",
          score: 0.7
        }
      );
    }

    return { entries, crossLinks };
  }

  function buildCategories(entries, preferred = []) {
    const countMap = new Map();
    for (const entry of entries) {
      const path = String(entry?.category || "unknown").trim() || "unknown";
      countMap.set(path, (countMap.get(path) || 0) + 1);
    }

    const categories = Array.from(countMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([path, count]) => ({
        id: path.replace(/\//g, "."),
        path,
        count
      }));

    for (const category of preferred) {
      const exists = categories.some((item) => item.path === category.path);
      if (!exists) {
        categories.push({
          id: category.id,
          path: category.path,
          count: 0
        });
      }
    }

    return categories.sort((a, b) => a.path.localeCompare(b.path));
  }

  function dedupeCrossLinks(crossLinks) {
    const map = new Map();

    for (const edge of crossLinks || []) {
      const source = String(edge?.source || "").trim();
      const target = String(edge?.target || "").trim();
      if (!source || !target) continue;

      const key = `${source}=>${target}`;
      if (!map.has(key)) {
        map.set(key, {
          source,
          target,
          reason: String(edge?.reason || "auto-link"),
          score: Number.isFinite(edge?.score) ? Number(edge.score) : 0.5
        });
      }
    }

    return Array.from(map.values());
  }

  function mergeCodexPayload(payload) {
    const baseEntries = Array.isArray(payload?.entries) ? payload.entries : [];
    const baseCrossLinks = Array.isArray(payload?.crossLinks) ? payload.crossLinks : [];
    const baseCategories = Array.isArray(payload?.categories) ? payload.categories : [];

    const siteArtifacts = discoverSiteArtifacts();
    const timestamp = nowIso();

    const allEntries = [
      ...baseEntries,
      ...AUTO_CODEX_STATIC.entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt || timestamp,
        updatedAt: entry.updatedAt || timestamp
      })),
      ...siteArtifacts.entries
    ];

    const entriesById = new Map();
    for (const entry of allEntries) {
      const id = String(entry?.id || "").trim();
      if (!id) continue;
      entriesById.set(id, entry);
    }

    const entries = Array.from(entriesById.values());
    const crossLinks = dedupeCrossLinks([
      ...baseCrossLinks,
      ...AUTO_CODEX_STATIC.crossLinks,
      ...siteArtifacts.crossLinks
    ]);

    const categories = buildCategories(entries, [
      ...baseCategories,
      ...AUTO_CODEX_STATIC.categories
    ]);

    state.autoArtifactCount = AUTO_CODEX_STATIC.entries.length + siteArtifacts.entries.length;

    return {
      ...payload,
      meta: {
        ...(payload?.meta || {}),
        generatedAt: timestamp,
        sourceGeneratedAt: payload?.meta?.generatedAt || "",
        entryCount: entries.length,
        autoCodexEnabled: state.autoCodexEnabled,
        autoGeneratedArtifacts: state.autoArtifactCount
      },
      categories,
      entries,
      crossLinks
    };
  }

  function renderStats(entries, crossLinks) {
    const generatedAt = state.index?.meta?.generatedAt;
    const chamberCount = new Set(entries.map((entry) => toChamber(entry))).size;

    if (statsEntries) statsEntries.textContent = String(entries.length);
    if (statsLinks) statsLinks.textContent = String(crossLinks.length);
    if (statsChambers) statsChambers.textContent = String(chamberCount);
    if (statsGenerated) statsGenerated.textContent = formatDate(generatedAt);
    if (statsAuto) statsAuto.textContent = String(state.autoArtifactCount);
  }

  function renderChamberButtons(entries) {
    if (!chamberButtonsRoot) return;

    const counts = getChamberCounts(entries);
    const chambers = ["all", ...new Set([...counts.keys()].sort((a, b) => a.localeCompare(b)))];

    chamberButtonsRoot.innerHTML = chambers
      .map((chamber) => {
        const count = chamber === "all" ? entries.length : counts.get(chamber) || 0;
        const activeClass = chamber === state.selectedChamber ? " is-active" : "";
        const label = chamber === "all" ? "All Chambers" : chamber;
        return `<button type="button" class="codex-chamber-btn${activeClass}" data-chamber="${escapeHtml(chamber)}">
          <span>${escapeHtml(label)}</span>
          <span class="codex-badge">${count}</span>
        </button>`;
      })
      .join("");

    chamberButtonsRoot.querySelectorAll(".codex-chamber-btn").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedChamber = button.getAttribute("data-chamber") || "all";
        renderExplorer();
      });
    });
  }

  function renderGraphInsights(entries, crossLinks) {
    if (!graphInsightRoot) return;

    const degree = new Map();

    for (const edge of crossLinks) {
      degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
    }

    const top = [...degree.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, score]) => ({ id, score, entry: entries.find((item) => item.id === id) }));

    if (!top.length) {
      graphInsightRoot.innerHTML = "<li>No graph edges found yet.</li>";
      return;
    }

    graphInsightRoot.innerHTML = top
      .map(
        (node) =>
          `<li><strong>${escapeHtml(node.entry?.title || node.id)}</strong> <span class="codex-muted">(${node.score} links)</span></li>`
      )
      .join("");
  }

  function renderExplorer() {
    if (!entryListRoot) return;

    const entries = sortEntries(getEntries());
    const filtered = filterEntries(entries);

    renderChamberButtons(entries);

    if (resultCount) {
      resultCount.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
    }

    if (!filtered.length) {
      entryListRoot.innerHTML = '<p class="codex-empty">No artifacts match the current chamber/search filter.</p>';
      return;
    }

    entryListRoot.innerHTML = filtered
      .map((entry) => {
        const pathHref = `/${String(entry.path || "").replace(/^\/+/, "")}`;
        const tags = Array.isArray(entry.tags) ? entry.tags : [];
        const links = [...new Set([...(entry.links || []), ...(entry.autoLinks || [])])].slice(0, 6);

        return `<article class="codex-entry-card">
          <div class="codex-entry-head">
            <h4 class="codex-entry-title">${escapeHtml(entry.title || entry.id)}</h4>
            <span class="codex-entry-meta">${escapeHtml(entry.type || "artifact")}</span>
          </div>
          <p class="codex-entry-meta">${escapeHtml(entry.id)} · ${escapeHtml(entry.category || "unknown")}</p>
          <a class="codex-entry-path" href="${escapeHtml(pathHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          entry.path || "(no path)"
        )}</a>
          <p class="codex-entry-meta">Updated: ${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</p>
          ${links.length ? `<p class="codex-entry-meta">Cross-links: ${escapeHtml(links.join(", "))}</p>` : ""}
          ${tags.length ? `<div class="codex-tag-row">${tags.slice(0, 12).map((tag) => `<span class="codex-tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        </article>`;
      })
      .join("");
  }

  function renderAll() {
    const entries = getEntries();
    const crossLinks = getCrossLinks();

    renderStats(entries, crossLinks);
    renderGraphInsights(entries, crossLinks);
    renderExplorer();
  }

  function setAutoStatus(message) {
    if (!autoStatus) return;
    autoStatus.textContent = message;
  }

  function scheduleAutoRefresh() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }

    if (!state.autoCodexEnabled) {
      setAutoStatus("Auto-Codex refresh is paused. Manual refresh remains available.");
      return;
    }

    state.timer = window.setInterval(() => {
      loadCodexIndex({ silentStatus: true });
    }, state.autoRefreshMs);

    setAutoStatus(`Auto-Codex is active. Refresh interval: ${Math.round(state.autoRefreshMs / 1000)}s.`);
  }

  async function loadCodexIndex(options = {}) {
    if (state.isLoading) return;

    const { silentStatus = false } = options;
    const candidates = ["/codex/index.json", "/codex-index.json"];

    state.isLoading = true;
    if (!silentStatus) {
      setAutoStatus("Refreshing Auto-Codex artifacts...");
    }

    try {
      let payload = null;

      for (const url of candidates) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) {
            continue;
          }
          payload = await response.json();
          break;
        } catch (_error) {
          continue;
        }
      }

      if (!payload) {
        throw new Error("No codex index source is reachable.");
      }

      state.index = mergeCodexPayload(payload);
      renderAll();
      setAutoStatus(`Auto-Codex updated at ${new Date().toLocaleTimeString()}.`);
    } catch (error) {
      if (statsEntries) statsEntries.textContent = "--";
      if (statsLinks) statsLinks.textContent = "--";
      if (statsChambers) statsChambers.textContent = "--";
      if (statsGenerated) statsGenerated.textContent = "--";
      if (statsAuto) statsAuto.textContent = "--";
      if (graphInsightRoot) {
        graphInsightRoot.innerHTML = `<li>Unable to load codex graph: ${escapeHtml(error.message)}</li>`;
      }
      if (entryListRoot) {
        entryListRoot.innerHTML = `<p class="codex-empty">Codex index is unavailable. Run <code>npm run codex:reindex</code> to regenerate <code>codex/index.json</code> and <code>public/codex-index.json</code>.</p>`;
      }
      if (resultCount) resultCount.textContent = "0 results";
      if (chamberButtonsRoot) chamberButtonsRoot.innerHTML = "";
      setAutoStatus("Auto-Codex could not refresh. Check codex index availability.");
    } finally {
      state.isLoading = false;
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value || "";
      renderExplorer();
    });
  }

  if (autoToggle) {
    autoToggle.checked = state.autoCodexEnabled;
    autoToggle.addEventListener("change", () => {
      state.autoCodexEnabled = autoToggle.checked;
      scheduleAutoRefresh();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadCodexIndex();
    });
  }

  scheduleAutoRefresh();
  loadCodexIndex();
})();
