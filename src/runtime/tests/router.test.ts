import assert from "node:assert/strict";
import test from "node:test";
import { resolveRuntimeRoute } from "../router.ts";

test("resolveRuntimeRoute prefers simulation policy for simulation requests", () => {
  const route = resolveRuntimeRoute(
    {
      mode: "simulation",
      latestUserText: "simulate downstream consequences for the system",
      requestedModel: "ION",
      hasSimulationContext: true
    },
    {
      MODEL_ION: "primary-model",
      MODEL_SIMULATION: "simulation-model"
    }
  );

  assert.equal(route.capability, "simulation-assist");
  assert.equal(route.selectedModel, "simulation-model");
  assert.equal(route.fallbackModel, "primary-model");
});

test("resolveRuntimeRoute infers simulation policy from natural language prompts", () => {
  const route = resolveRuntimeRoute(
    {
      mode: "auto",
      latestUserText: "Play out a supply chain stress test over 5 steps and summarize the state changes.",
      requestedModel: "ION",
      hasSimulationContext: false
    },
    {
      MODEL_ION: "primary-model",
      MODEL_SIMULATION: "simulation-model"
    }
  );

  assert.equal(route.capability, "simulation-assist");
  assert.equal(route.selectedModel, "simulation-model");
  assert.equal(route.reason, "simulation-intent-policy");
});