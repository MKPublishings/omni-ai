import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hierarchyEngine } from "../src/core/hierarchy-engine.js";
import { hierarchyModules } from "../src/bootstrap/register-all-points.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("hierarchy engine registers and executes the sovereign workspace creation feature", async () => {
  hierarchyEngine.initialize();
  await hierarchyEngine.registerModules(hierarchyModules);

  const response = await hierarchyEngine.execute({
    pointId: "P8",
    featureId: "workspace-creation",
    payload: { operator: "test" }
  });

  assert.equal(response.event.type, "workspace.created");
  assert.match(response.result.artifact, /P8:workspace-creation:test/);

  const audit = hierarchyEngine.audit(workspaceRoot);
  assert.match(audit, /Hierarchy Config/);
});