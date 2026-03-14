import assert from "node:assert/strict";
import test from "node:test";
import { omniBrainLoop } from "../loop.ts";

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

test("omniBrainLoop attaches simulation context for simulation mode", async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  const result = await omniBrainLoop(
    {
      AI: {
        run: async () => ({ response: "Simulation response stable." })
      },
      MEMORY: memory as any,
      MIND: mind as any,
      MODEL_OMNI: "primary-model",
      MODEL_SIMULATION: "simulation-model"
    },
    {
      mode: "simulation",
      model: "omni",
      messages: [{ role: "user", content: "simulate system recovery under pressure" }],
      maxOutputTokens: 256
    }
  );

  assert.equal(result.response, "Simulation response stable.");
  assert.equal(result.simulationUsed, true);
  assert.equal(result.modelUsed, "simulation-model");
  assert.ok(result.diagnostics.some((entry) => entry.startsWith("simulation:")));
});