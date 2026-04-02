import assert from "node:assert/strict";
import test from "node:test";
import { CosmicEngine } from "../cosmic_engine.ts";
import { createDefaultConfig, initializeCosmicMode } from "../cosmic_mode.ts";

test("cosmic engine is deterministic for same seed", () => {
  const cfg = { ...createDefaultConfig(), total_duration: 5, timestep: 1, seed: 999 };

  const e1 = new CosmicEngine(cfg);
  e1.initialize();
  e1.run(5);
  const s1 = e1.getState();

  const e2 = new CosmicEngine(cfg);
  e2.initialize();
  e2.run(5);
  const s2 = e2.getState();

  assert.equal(s1.current_time, s2.current_time);
  assert.equal(s1.step_count, s2.step_count);
  assert.equal(s1.diagnostics.total_mass, s2.diagnostics.total_mass);
});

test("serialization round-trip restores state", () => {
  const cfg = { ...createDefaultConfig(), total_duration: 3, timestep: 1, seed: 42 };
  const engine = new CosmicEngine(cfg);
  engine.initialize();
  engine.run(3);

  const restored = CosmicEngine.deserialize(engine.serialize());
  const a = engine.getState();
  const b = restored.getState();

  assert.equal(a.current_time, b.current_time);
  assert.equal(a.diagnostics.total_mass, b.diagnostics.total_mass);
});

test("initializeCosmicMode returns initialized adapter", () => {
  const adapter = initializeCosmicMode({ total_duration: 1, seed: 7 });
  const state = adapter.getState();
  assert.equal(state.step_count, 0);
});
