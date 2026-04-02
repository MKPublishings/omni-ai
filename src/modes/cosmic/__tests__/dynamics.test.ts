import assert from "node:assert/strict";
import test from "node:test";
import { computeEscapeVelocity, computeRotationState } from "../galactic_dynamics.ts";
import { COSMIC_CONSTANTS } from "../cosmic_constants.ts";

const MW = COSMIC_CONSTANTS.MW;

test("rotation state has positive circular speed at R_sun", () => {
  const rot = computeRotationState(MW.R_SUN);
  assert.ok(rot.v_circ > 150);
  assert.ok(rot.omega > 0);
  assert.ok(rot.kappa >= 0);
});

test("escape velocity exceeds circular velocity", () => {
  const rot = computeRotationState(MW.R_SUN);
  const vEsc = computeEscapeVelocity(MW.R_SUN);
  assert.ok(vEsc > rot.v_circ);
});
