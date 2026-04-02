import assert from "node:assert/strict";
import test from "node:test";
import {
  computeMainSequenceLifetime,
  computeSFR,
  sampleIMF
} from "../stellar_formation.ts";
import { Mulberry32RNG } from "../rng.ts";
import { COSMIC_CONSTANTS } from "../cosmic_constants.ts";

test("kroupa IMF mean mass is plausible", () => {
  const imf = sampleIMF(1e6, new Mulberry32RNG(12345));
  assert.ok(imf.mean_mass > 0.2 && imf.mean_mass < 0.8);
  assert.ok(imf.total_number > 0);
});

test("main sequence lifetimes scale correctly", () => {
  const tauSun = computeMainSequenceLifetime(1);
  const tauMassive = computeMainSequenceLifetime(25);
  assert.ok(tauSun > 8000 && tauSun < 12000);
  assert.ok(tauMassive < 20);
});

test("disk SFR profile is positive in inner galaxy", () => {
  const MW = COSMIC_CONSTANTS.MW;
  const sigma0 = MW.GAS_MASS_TOTAL / (2 * Math.PI * MW.GAS_SCALE_LENGTH * MW.GAS_SCALE_LENGTH);
  const sigma = sigma0 * Math.exp(-8 / MW.GAS_SCALE_LENGTH);
  const sfr = computeSFR(sigma, 8);
  assert.ok(sfr > 0);
});
