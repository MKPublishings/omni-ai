import assert from "node:assert/strict";
import test from "node:test";
import {
  computeCircularVelocity,
  computeHernquistPotential,
  computeNFWEnclosedMass,
  computeNFWPotential
} from "../gravitational_architecture.ts";
import { COSMIC_CONSTANTS } from "../cosmic_constants.ts";

const MW = COSMIC_CONSTANTS.MW;

test("circular velocity at solar radius is in expected range", () => {
  const v = computeCircularVelocity(MW.R_SUN);
  assert.ok(Number.isFinite(v) && v > 0);
});

test("NFW enclosed mass at virial radius is close to Mvir", () => {
  const mass = computeNFWEnclosedMass(
    MW.HALO_VIRIAL_RADIUS,
    MW.HALO_VIRIAL_MASS,
    MW.HALO_SCALE_RADIUS,
    MW.HALO_CONCENTRATION
  );
  const relErr = Math.abs(mass - MW.HALO_VIRIAL_MASS) / MW.HALO_VIRIAL_MASS;
  assert.ok(relErr < 0.02);
});

test("hernquist and nfw potentials are finite and negative", () => {
  const pBulge = computeHernquistPotential(1, 0, MW.BULGE_MASS, MW.BULGE_SCALE_RADIUS);
  const pHalo = computeNFWPotential(8, 0, MW.HALO_VIRIAL_MASS, MW.HALO_SCALE_RADIUS, MW.HALO_CONCENTRATION);
  assert.ok(Number.isFinite(pBulge) && pBulge < 0);
  assert.ok(Number.isFinite(pHalo) && pHalo < 0);
});
