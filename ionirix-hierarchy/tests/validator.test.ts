import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import config from "../hierarchy.config.json" with { type: "json" };
import { hierarchyModules } from "../src/bootstrap/register-all-points.js";
import { HierarchyValidator } from "../src/integrations/hierarchy-validator.js";
import { HierarchyConfig } from "../src/core/types.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("hierarchy validator reports a compliant workspace", () => {
  const validator = new HierarchyValidator(config as HierarchyConfig, hierarchyModules, workspaceRoot);
  const result = validator.validateAll();

  assert.equal(result.summary.checksRun, 6);
  assert.equal(result.summary.criticalCount, 0);
  assert.equal(result.summary.passed, true);
});