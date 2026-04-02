// =============================================================================
// spiral_arm_dynamics.ts
// Ionirix Cosmic Mode - Spiral arm density-wave dynamics
// =============================================================================

import { COSMIC_CONSTANTS } from "./cosmic_constants.ts";
import type { GalacticPosition, SpiralArmState, SpiralPerturbation } from "./cosmic_schema.ts";
import { SpiralArm } from "./cosmic_schema.ts";
import { computeRotationState } from "./galactic_dynamics.ts";

const MW = COSMIC_CONSTANTS.MW;
const DEG_TO_RAD = COSMIC_CONSTANTS.DEG_TO_RAD;
const KM_S_TO_KPC_MYR = COSMIC_CONSTANTS.KM_S_TO_KPC_MYR;
const R_REF = MW.R_SUN;

const ARM_CONFIG: Record<SpiralArm, { phi_ref_deg: number; r_inner: number; r_outer: number; amplitude: number; width: number }> = {
  [SpiralArm.SCUTUM_CENTAURUS]: { phi_ref_deg: 0, r_inner: 3.0, r_outer: 14.0, amplitude: 0.15, width: 0.8 },
  [SpiralArm.SAGITTARIUS_CARINA]: { phi_ref_deg: 60, r_inner: 3.5, r_outer: 13.0, amplitude: 0.12, width: 0.7 },
  [SpiralArm.PERSEUS]: { phi_ref_deg: 180, r_inner: 4.0, r_outer: 18.0, amplitude: 0.14, width: 0.9 },
  [SpiralArm.NORMA_OUTER]: { phi_ref_deg: 270, r_inner: 3.0, r_outer: 16.0, amplitude: 0.10, width: 0.7 },
  [SpiralArm.LOCAL_SPUR]: { phi_ref_deg: 135, r_inner: 7.0, r_outer: 9.5, amplitude: 0.05, width: 0.4 }
};

export function initializeSpiralArms(): SpiralArmState[] {
  return Object.values(SpiralArm).map((arm) => ({
    arm,
    phase_angle: ARM_CONFIG[arm].phi_ref_deg * DEG_TO_RAD,
    amplitude: ARM_CONFIG[arm].amplitude,
    pitch_angle: arm === SpiralArm.LOCAL_SPUR ? 15 : MW.ARM_PITCH_ANGLE,
    width: ARM_CONFIG[arm].width,
    pattern_speed: MW.PATTERN_SPEED,
    inner_radius: ARM_CONFIG[arm].r_inner,
    outer_radius: ARM_CONFIG[arm].r_outer,
    is_growing: false
  }));
}

export function spiralShapeFunction(R: number, pitchAngle: number, Rref: number, phiRef: number): number {
  const tanI = Math.tan(pitchAngle * DEG_TO_RAD);
  if (Math.abs(tanI) < 1e-10) return phiRef;
  return phiRef + (1 / tanI) * Math.log(R / Math.max(Rref, 1e-6));
}

export function computeArmAmplitude(R: number, rInner: number, rOuter: number, ampPeak: number): number {
  if (R < rInner || R > rOuter) return 0;
  const mid = 0.5 * (rInner + rOuter);
  const sigma = 0.25 * (rOuter - rInner);
  return ampPeak * Math.exp(-0.5 * Math.pow((R - mid) / Math.max(sigma, 1e-6), 2));
}

export function computeSpiralPotential(R: number, phi: number, time: number, arm: SpiralArmState): number {
  const m = MW.ARM_COUNT;
  const omegaP = arm.pattern_speed * KM_S_TO_KPC_MYR;
  const fR = spiralShapeFunction(R, arm.pitch_angle, R_REF, arm.phase_angle);
  const amplitude = computeArmAmplitude(R, arm.inner_radius, arm.outer_radius, arm.amplitude);
  const vc = computeRotationState(Math.max(R, 0.1)).v_circ * KM_S_TO_KPC_MYR;
  const phase = m * (phi - omegaP * time) - fR;
  return -amplitude * vc * vc * Math.cos(phase);
}

export function computeSpiralPerturbation(pos: GalacticPosition, time: number, arms: SpiralArmState[]): SpiralPerturbation {
  let deltaPhi = 0;
  let deltaRho = 0;
  let deltaVR = 0;
  let deltaVPhi = 0;

  for (const arm of arms) {
    const pot = computeSpiralPotential(pos.R, pos.phi, time, arm);
    deltaPhi += pot;
    const sigmaRGal = 40 * KM_S_TO_KPC_MYR;
    if (sigmaRGal > 0) deltaRho += -pot / (sigmaRGal * sigmaRGal);

    const fR = spiralShapeFunction(pos.R, arm.pitch_angle, R_REF, arm.phase_angle);
    const phase = MW.ARM_COUNT * (pos.phi - arm.pattern_speed * KM_S_TO_KPC_MYR * time) - fR;
    const vScale = arm.amplitude * computeRotationState(Math.max(pos.R, 0.1)).v_circ * 0.1;
    deltaVR += vScale * Math.sin(phase);
    deltaVPhi += vScale * Math.cos(phase);
  }

  return {
    delta_phi: deltaPhi,
    delta_rho: deltaRho,
    delta_v_R: deltaVR,
    delta_v_phi: deltaVPhi
  };
}

export function updateSpiralArms(arms: SpiralArmState[], dt: number): SpiralArmState[] {
  return arms.map((arm) => {
    const omegaP = arm.pattern_speed * KM_S_TO_KPC_MYR;
    const newPhase = (arm.phase_angle + MW.ARM_COUNT * omegaP * dt) % (2 * Math.PI);
    const newAmplitude = arm.is_growing ? Math.min(0.25, arm.amplitude * Math.exp(5e-4 * dt)) : arm.amplitude * Math.exp(-1e-4 * dt);
    return { ...arm, phase_angle: newPhase, amplitude: newAmplitude };
  });
}
