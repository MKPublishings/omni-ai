import assert from "node:assert/strict";
import test from "node:test";
import { advanceSimulationState, exportSimulationState } from "../../ION/simulation/engine.ts";
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

class MemoryNamespace {
  store = new Map<string, string>();

  async get(key: string, type?: string): Promise<any> {
    const value = this.store.get(key);
    if (value === undefined) return null;
    if (type === "json") return JSON.parse(value);
    return value;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

test("advanceSimulationState tracks lifecycle progress and export payload", async () => {
  const memory = new MemoryNamespace();

  const started = await advanceSimulationState(
    { MEMORY: memory as any },
    [{ role: "user", content: "/simulation start target 4 steps\nrules:\n- stability: high\n- resources: preserve" }],
    { sessionId: "alpha" }
  );

  assert.equal(started.state.sessionId, "alpha");
  assert.equal(started.state.targetSteps, 4);
  assert.equal(started.state.stepsExecuted, 3);
  assert.equal(started.state.completionPercentage, 75);
  assert.equal(started.state.status, "active");
  assert.match(started.logsSummary, /75%/);
  assert.match(started.chatSummary, /Export:/);

  const completed = await advanceSimulationState(
    { MEMORY: memory as any },
    [{ role: "user", content: "/simulation start /simulation advance 1 step" }],
    { sessionId: "alpha" }
  );

  assert.equal(completed.state.stepsExecuted, 4);
  assert.equal(completed.state.completionPercentage, 100);
  assert.equal(completed.state.status, "completed");
  assert.match(completed.state.resultSummary, /Progress 100%/);

  const exported = await exportSimulationState({ MEMORY: memory as any }, { sessionId: "alpha" });
  assert.equal(exported.progress.completionPercentage, 100);
  assert.equal(exported.results.recentHistory.length > 0, true);
  assert.match(exported.chatReport, /ready for export|Export:/i);
  assert.match(exported.fileName, /simulation-sim_/);
});

test("advanceSimulationState isolates sessions and respects pause or stop controls", async () => {
  const memory = new MemoryNamespace();

  const alpha = await advanceSimulationState(
    { MEMORY: memory as any },
    [{ role: "user", content: "/simulation start target 6 steps" }],
    { sessionId: "alpha" }
  );
  const beta = await advanceSimulationState(
    { MEMORY: memory as any },
    [{ role: "user", content: "/simulation start target 2 steps" }],
    { sessionId: "beta" }
  );

  assert.notEqual(alpha.state.simulationId, beta.state.simulationId);
  assert.equal(alpha.state.sessionId, "alpha");
  assert.equal(beta.state.sessionId, "beta");

  const paused = await advanceSimulationState(
    { MEMORY: memory as any },
    [{ role: "user", content: "/simulation pause" }],
    { sessionId: "alpha" }
  );
  assert.equal(paused.state.status, "paused");
  assert.equal(paused.state.stepsExecuted, alpha.state.stepsExecuted);

  const stopped = await advanceSimulationState(
    { MEMORY: memory as any },
    [{ role: "user", content: "/simulation stop" }],
    { sessionId: "beta" }
  );
  assert.equal(stopped.state.status, "stopped");
  assert.equal(stopped.state.stepsExecuted, beta.state.stepsExecuted);
});
