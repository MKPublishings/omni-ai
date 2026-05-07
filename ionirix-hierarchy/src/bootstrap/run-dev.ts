import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerAllPoints } from "./register-all-points.js";
import { hierarchyEngine } from "../core/hierarchy-engine.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function main(): Promise<void> {
  await registerAllPoints();
  const execution = await hierarchyEngine.execute({
    pointId: "P8",
    featureId: "workspace-creation",
    payload: { operator: "boot-sequence", mode: "dev" }
  });

  console.log(`Executed ${execution.result.featureId} -> ${execution.result.artifact}`);
  console.log(hierarchyEngine.audit(workspaceRoot));
}

void main();