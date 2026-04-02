(function () {
  const SPEC_DOCS = {
    "ion-ai-release-spec": {
      title: "ION Ai Release Specification",
      kicker: "Public runtime",
      badge: "v1.0.0",
      badgeClass: "live",
      source: "/specs-src/ion-ai-release-spec.md",
      summary: "Public runtime declaration, release assertions, and endpoint coverage for ION Ai v1.0.0."
    },
    "release-hardening-checklist": {
      title: "ION Ai Release Hardening Checklist",
      kicker: "Operations",
      badge: "Current",
      badgeClass: "current",
      source: "/specs-src/release-hardening-checklist.md",
      summary: "Production readiness contract for bindings, secrets, endpoint protection, readiness checks, and post-deploy observation."
    },
    "environment-mode-implementation-guide": {
      title: "Environment Mode Implementation Guide",
      kicker: "Mode #12",
      badge: "Integrated",
      badgeClass: "current",
      source: "/specs-src/environment-mode-implementation-guide.md",
      summary: "Planetary-scale environmental simulation guide covering file tree, integrations, dependency graph, scale table, and runtime usage."
    },
    "ionirix-multiverse-mode-technical-specification": {
      title: "Multiverse Mode Technical Specification",
      kicker: "Build 2026.04.02",
      badge: "Production-ready",
      badgeClass: "live",
      source: "/specs-src/ionirix-multiverse-mode-technical-specification.md",
      summary: "Sovereign observable-universe simulation contract with deterministic generation, cosmology bounds, octree traversal, and test obligations."
    },
    "ionirix-cosmic-mode-implementation-continuation": {
      title: "Cosmic Mode Implementation Continuation",
      kicker: "Galactic runtime",
      badge: "2026-04-02",
      badgeClass: "internal",
      source: "/specs-src/ionirix-cosmic-mode-implementation-continuation.md",
      summary: "Milky Way-scale deterministic simulation implementation notes covering public API, RNG contract, diagnostics, and file manifest."
    },
    "ion-ai-media-rebuild-spec": {
      title: "ION Ai Media Rebuild Spec",
      kicker: "Media system",
      badge: "ION-native",
      badgeClass: "current",
      source: "/specs-src/ion-ai-media-rebuild-spec.md",
      summary: "Unified image, video, and GIF generation contract for the ION-native pipeline, including latency, safety, and rollout requirements."
    },
    "quantum-cognitive-simulation-release-notes": {
      title: "Quantum-Cognitive Simulation Release Notes",
      kicker: "Research simulation",
      badge: "Production-ready",
      badgeClass: "live",
      source: "/specs-src/quantum-cognitive-simulation-release-notes.md",
      summary: "Physics-based neural stress simulation release with module coverage, codex artifacts, observability, and performance notes."
    }
  };

  window.ION_SPEC_DOCS = SPEC_DOCS;

  const viewer = document.querySelector("[data-spec-viewer]");
  if (!viewer) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const docId = params.get("doc") || "ion-ai-release-spec";
  const doc = SPEC_DOCS[docId];

  if (!doc) {
    viewer.innerHTML = "<div class=\"spec-document-card\"><h3 class=\"spec-document-title\">Specification Not Found</h3><p class=\"spec-document-empty\">The requested spec does not exist in the published library.</p><a href=\"/specs.html\" class=\"spec-pill\">Open spec library</a></div>";
    return;
  }

  document.title = `${doc.title} - Ionirix LLC`;

  const headerTitle = document.querySelector("[data-spec-title]");
  const headerSubtitle = document.querySelector("[data-spec-subtitle]");
  const badge = document.querySelector("[data-spec-badge]");
  const markdownTarget = document.querySelector("[data-spec-markdown]");
  const sourceLink = document.querySelector("[data-spec-source-link]");

  if (headerTitle) headerTitle.textContent = doc.title;
  if (headerSubtitle) headerSubtitle.textContent = doc.summary;
  if (badge) {
    badge.textContent = doc.badge;
    badge.className = `spec-card-badge ${doc.badgeClass}`;
  }

  viewer.insertAdjacentHTML(
    "afterbegin",
    `<div class="spec-document-card"><div class="spec-card-head"><p class="spec-card-kicker">${doc.kicker}</p><span class="spec-card-badge ${doc.badgeClass}">${doc.badge}</span></div><h3 class="spec-document-title">${doc.title}</h3><p class="spec-document-summary">${doc.summary}</p></div>`
  );

  if (sourceLink) {
    sourceLink.href = doc.source;
  }

  fetch(doc.source)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch ${doc.source}`);
      }
      return response.text();
    })
    .then((text) => {
      if (markdownTarget) {
        markdownTarget.textContent = text;
      }
    })
    .catch(() => {
      if (markdownTarget) {
        markdownTarget.textContent = "Unable to load the published markdown source for this specification.";
      }
    });
})();