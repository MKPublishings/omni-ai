import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import config from "../hierarchy.config.json" with { type: "json" };
import { hierarchyModules } from "../src/bootstrap/register-all-points.js";
import { HierarchyValidator } from "../src/integrations/hierarchy-validator.js";
import { HierarchyConfig } from "../src/core/types.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const typedConfig = config as HierarchyConfig;
const validator = new HierarchyValidator(typedConfig, hierarchyModules, workspaceRoot);
const result = validator.validateAll();

const checks = [
  ["Constitution present", typedConfig.constitution.length > 0],
  ["Eight points declared", typedConfig.points.length === 8],
  ["Thirty-two features declared", typedConfig.points.reduce((count, point) => count + point.features.length, 0) === 32],
  ["Twenty-eight event types declared", typedConfig.eventTypes.length === 28],
  ["All eight manifests available", hierarchyModules.length === 8],
  ["No critical compliance violations", result.summary.criticalCount === 0]
] as const;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (!result.summary.passed) {
  for (const violation of result.violations) {
    console.error(`[${violation.severity.toUpperCase()}] ${violation.scope}: ${violation.message}`);
  }
  process.exitCode = 1;
}