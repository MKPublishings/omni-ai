import assert from "node:assert/strict";
import test from "node:test";
import {
  computeCoolingRate,
  computeHeatingRate,
  computeThermalEquilibrium,
  determineISMPhase
} from "../interstellar_medium.ts";

test("thermal equilibrium returns finite temperature", () => {
  const T = computeThermalEquilibrium(0.5, 1.0, 2e-16, 1.0);
  assert.ok(Number.isFinite(T));
  assert.ok(T > 10 && T < 1e7);
});

test("cooling and heating are positive for physical inputs", () => {
  const cool = computeCoolingRate(8000, 1, 1);
  const heat = computeHeatingRate(1, 1, 2e-16);
  assert.ok(cool > 0);
  assert.ok(heat > 0);
});

test("phase classifier returns expected labels for extremes", () => {
  assert.equal(determineISMPhase(15, 500), "MOLECULAR");
  assert.equal(determineISMPhase(6000, 0.3), "WARM_NEUTRAL");
  assert.equal(determineISMPhase(1e6, 0.003), "HOT_IONIZED");
});
