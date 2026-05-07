import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import config from "../hierarchy.config.json" with { type: "json" };
import { hierarchyModules } from "../src/bootstrap/register-all-points.js";
import { HierarchyConfig } from "../src/core/types.js";
import { HierarchyValidator } from "../src/integrations/hierarchy-validator.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const validator = new HierarchyValidator(config as HierarchyConfig, hierarchyModules, workspaceRoot);
const report = validator.buildAuditReport();
const reportsDir = resolve(workspaceRoot, "docs", "reports");

mkdirSync(reportsDir, { recursive: true });
writeFileSync(resolve(reportsDir, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(validator.formatAuditReport());