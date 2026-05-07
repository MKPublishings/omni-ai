const data = window.__IONIRIX_HIERARCHY__;

if (!data) {
  throw new Error("Hierarchy command-center data is missing. Run npm run ui:refresh.");
}

const headlineMetrics = document.getElementById("headline-metrics");
const generatedAt = document.getElementById("generated-at");
const summaryGrid = document.getElementById("summary-grid");
const pointGrid = document.getElementById("point-grid");
const auditList = document.getElementById("audit-list");
const topologyGrid = document.getElementById("topology-grid");

const headlineItems = [
  ["Points", data.summary.points],
  ["Features", data.summary.features],
  ["Events", data.summary.events],
  ["Critical", data.summary.criticalViolations]
];

headlineMetrics.innerHTML = headlineItems
  .map(
    ([label, value]) => `
      <div class="metric-tile">
        <div class="metric-label">${label}</div>
        <div class="metric-value">${value}</div>
      </div>
    `
  )
  .join("");

generatedAt.textContent = `Snapshot generated ${new Date(data.generatedAt).toLocaleString()}`;

const summaryItems = [
  {
    label: "Constitutional Points",
    value: data.summary.points,
    detail: "All eight points declared and registered."
  },
  {
    label: "Traceable Features",
    value: data.summary.features,
    detail: "Every feature mapped to a constitutional point."
  },
  {
    label: "Authorized Events",
    value: data.summary.events,
    detail: "Bus topology is explicitly machine-defined."
  },
  {
    label: "Inbound Subscriptions",
    value: data.summary.subscriptions,
    detail: "Cross-point flow is constrained to declared listeners."
  }
];

summaryGrid.innerHTML = summaryItems
  .map(
    (item) => `
      <article class="metric-card">
        <span class="metric-label">${item.label}</span>
        <strong>${item.value}</strong>
        <p class="point-meta">${item.detail}</p>
      </article>
    `
  )
  .join("");

pointGrid.innerHTML = data.points
  .map(
    (point) => `
      <article class="point-card">
        <div class="point-heading">
          <div>
            <p class="eyebrow">${point.slug}</p>
            <h3>${point.title}</h3>
            <p class="point-meta">${point.features.length} features · ${point.subscriptions.length} subscriptions</p>
          </div>
          <div class="point-rank">${point.pointId}</div>
        </div>
        <div class="feature-list">
          ${point.features
            .map((feature) => `<span class="feature-chip">${feature.title}</span>`)
            .join("")}
        </div>
        <div class="subscription-block">
          <p class="point-meta">Templates</p>
          <div class="chip-row">
            ${point.templates.map((template) => `<span class="list-chip">${template.split("/").pop()}</span>`).join("")}
          </div>
        </div>
        <div class="subscription-block">
          <p class="point-meta">Tags</p>
          <div class="chip-row">
            ${point.tags.map((tag) => `<span class="list-chip">${tag}</span>`).join("")}
          </div>
        </div>
      </article>
    `
  )
  .join("");

auditList.innerHTML = data.auditSections
  .map(
    (section) => `
      <article class="audit-card">
        <header>
          <h3>${section.title}</h3>
          <span class="status-chip ${section.status}">${section.status.toUpperCase()}</span>
        </header>
        <p class="audit-detail">${section.detail}</p>
      </article>
    `
  )
  .join("");

topologyGrid.innerHTML = data.points
  .map((point) => {
    const emits = data.busTopology.emitters[point.pointId] ?? [];
    const subscribes = data.busTopology.subscribers[point.pointId] ?? [];

    return `
      <article class="topology-card">
        <header>
          <h3>${point.pointId}</h3>
          <span class="point-meta">${point.slug}</span>
        </header>
        <p class="point-meta">Emits</p>
        <ul class="topology-list">
          ${emits.map((eventName) => `<li>${eventName}</li>`).join("")}
        </ul>
        <p class="point-meta">Subscribes</p>
        <ul class="topology-list">
          ${subscribes.map((eventName) => `<li>${eventName}</li>`).join("")}
        </ul>
      </article>
    `;
  })
  .join("");