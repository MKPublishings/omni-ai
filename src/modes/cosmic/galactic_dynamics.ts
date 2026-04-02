// =============================================================================
// galactic_dynamics.ts
// Ionirix Cosmic Mode - Rotation curve and orbital diagnostics
// =============================================================================

import { COSMIC_CONSTANTS } from "./cosmic_constants.ts";
import type { GalacticPosition, GalacticVelocity, RotationState } from "./cosmic_schema.ts";
import { computeCircularVelocity, computeTotalPotential } from "./gravitational_architecture.ts";

const KPC_MYR_TO_KM_S = COSMIC_CONSTANTS.KPC_MYR_TO_KM_S;
const KM_S_TO_KPC_MYR = COSMIC_CONSTANTS.KM_S_TO_KPC_MYR;
const DERIV_H = 0.01;

export function computeRotationState(R: number): RotationState {
  if (R < 0.01) {
    return { v_circ: 0, omega: 0, kappa: 0, nu: 0, oort_A: 0, oort_B: 0 };
  }

  const v_circ = computeCircularVelocity(R);
  const omega = v_circ / R;

  const vP = computeCircularVelocity(R + DERIV_H);
  const vM = computeCircularVelocity(R - DERIV_H);
  const omegaP = vP / (R + DERIV_H);
  const omegaM = vM / (R - DERIV_H);
  const dOmega_dR = (omegaP - omegaM) / (2 * DERIV_H);

  const kappa2 = 4 * omega * omega + 2 * omega * R * dOmega_dR;
  const kappa = kappa2 > 0 ? Math.sqrt(kappa2) : 0;

  const h = 0.005;
  const phiZp = computeTotalPotential({ R, phi: 0, z: h }).phi_total;
  const phiZ0 = computeTotalPotential({ R, phi: 0, z: 0 }).phi_total;
  const phiZm = computeTotalPotential({ R, phi: 0, z: -h }).phi_total;
  const d2PhiDz2 = (phiZp - 2 * phiZ0 + phiZm) / (h * h);
  const nu = d2PhiDz2 > 0 ? Math.sqrt(d2PhiDz2) * KPC_MYR_TO_KM_S : 0;

  const oort_A = -0.5 * R * dOmega_dR;
  const oort_B = -(omega + 0.5 * R * dOmega_dR);

  return { v_circ, omega, kappa, nu, oort_A, oort_B };
}

export function computeRotationCurve(Rmin: number, Rmax: number, bins: number): RotationState[] {
  const out: RotationState[] = [];
  const dR = (Rmax - Rmin) / Math.max(bins, 1);
  for (let i = 0; i < bins; i++) {
    out.push(computeRotationState(Rmin + (i + 0.5) * dR));
  }
  return out;
}

export function computeToomreQ(R: number, sigmaR: number, kappa: number, sigmaGas: number): number {
  void R;
  if (sigmaGas <= 0 || kappa <= 0) return Number.POSITIVE_INFINITY;
  const G = COSMIC_CONSTANTS.G;
  const kappaMyr = kappa * KM_S_TO_KPC_MYR;
  const sigmaRMyr = sigmaR * KM_S_TO_KPC_MYR;
  return (kappaMyr * sigmaRMyr) / (Math.PI * G * sigmaGas);
}

export function computeEscapeVelocity(R: number): number {
  const pot = computeTotalPotential({ R, phi: 0, z: 0 });
  return Math.sqrt(2 * Math.abs(pot.phi_total)) * KPC_MYR_TO_KM_S;
}

export function integrateOrbit(
  pos: GalacticPosition,
  vel: GalacticVelocity,
  duration: number,
  dt: number
): Array<{ t: number; pos: GalacticPosition; vel: GalacticVelocity }> {
  const steps = Math.max(1, Math.ceil(duration / dt));
  const out: Array<{ t: number; pos: GalacticPosition; vel: GalacticVelocity }> = [];

  let R = pos.R;
  let phi = pos.phi;
  let z = pos.z;
  const vR = vel.v_R;
  const vPhi = vel.v_phi;
  const vZ = vel.v_z;

  out.push({ t: 0, pos: { R, phi, z }, vel: { v_R: vR, v_phi: vPhi, v_z: vZ } });
  for (let i = 1; i <= steps; i++) {
    const dtKpc = dt * KM_S_TO_KPC_MYR;
    R = Math.max(0.001, R + vR * dtKpc);
    phi = (phi + (R > 0.001 ? (vPhi * dtKpc) / R : 0)) % (2 * Math.PI);
    if (phi < 0) phi += 2 * Math.PI;
    z += vZ * dtKpc;
    out.push({ t: i * dt, pos: { R, phi, z }, vel: { v_R: vR, v_phi: vPhi, v_z: vZ } });
  }

  return out;
}
