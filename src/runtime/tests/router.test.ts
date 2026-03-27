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