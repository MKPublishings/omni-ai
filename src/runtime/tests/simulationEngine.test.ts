import assert from "node:assert/strict";
import test from "node:test";
import { SimulationEngine } from "../../simulation/core.ts";

test("SimulationEngine runStep advances world state deterministically", () => {
  const engine = new SimulationEngine();
  const world = engine.bootstrapWorld({ rules: ["domain: bounded", "goal: preserve coherence"] });

  const next = engine.runStep(world, {
    userIntent: "stabilize the system and preserve coherence",
    directives: ["stability: high", "resources: preserve"],
    mode: "simulation"
  });

  assert.equal(next.tick, 1);
  assert.equal(next.environment.time, 1);
  assert.equal(next.history.length, 1);
  assert.equal(next.history[0]?.actions.length, next.agents.length);
  assert.deepEqual(next.environment.rules, ["stability: high", "resources: preserve"]);
});