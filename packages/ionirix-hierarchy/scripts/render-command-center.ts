import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import config from "../hierarchy.config.json" with { type: "json" };
import { hierarchyModules } from "../src/bootstrap/register-all-points.js";
import { HierarchyConfig } from "../src/core/types.js";
import { HierarchyValidator } from "../src/integrations/hierarchy-validator.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const typedConfig = config as HierarchyConfig;
const validator = new HierarchyValidator(typedConfig, hierarchyModules, workspaceRoot);
const report = validator.buildAuditReport();

const pointCards = hierarchyModules.map((manifest) => ({
  pointId: manifest.pointId,
  slug: manifest.slug,
  title: manifest.title,
  features: manifest.features.map((feature) => ({
    id: feature.id,
    title: feature.title,
    eventType: feature.eventType
  })),
  subscriptions: manifest.allowedSubscriptions,
  tags: manifest.metadata.tags,
  templates: manifest.templates
}));

const data = {
  generatedAt: new Date().toISOString(),
  summary: {
    points: typedConfig.points.length,
    features: pointCards.reduce((count, point) => count + point.features.length, 0),
    events: typedConfig.eventTypes.length,
    subscriptions: pointCards.reduce((count, point) => count + point.subscriptions.length, 0),
    criticalViolations: report.summary.criticalCount
  },
  points: pointCards,
  auditSections: report.sections,
  busTopology: typedConfig.busTopology
};

const reportsDir = resolve(workspaceRoot, "docs", "reports");
mkdirSync(reportsDir, { recursive: true });
writeFileSync(resolve(reportsDir, "command-center-data.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
writeFileSync(
  resolve(reportsDir, "command-center-data.js"),
  `window.__IONIRIX_HIERARCHY__ = ${JSON.stringify(data, null, 2)};\n`,
  "utf8"
);

console.log(`Command center data refreshed at ${resolve(reportsDir, "command-center-data.js")}`);