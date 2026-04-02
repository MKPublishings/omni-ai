// =============================================================================
// emergent_behavior.ts
// Ionirix Cosmic Mode - Bar, warp, migration, and feedback
// =============================================================================

import { COSMIC_CONSTANTS } from "./cosmic_constants.ts";
import type {
  BarState,
  CosmicSimulationState,
  FeedbackState,
  GalacticPosition,
  GalacticVelocity,
  ISMCell,
  SeededRNG,
  SecularEvolutionState,
  SpiralArmState,
  StellarDeathEvent,
  StellarPopulation,
  WarpState
} from "./cosmic_schema.ts";

const MW = COSMIC_CONSTANTS.MW;
const KM_S_TO_KPC_MYR = COSMIC_CONSTANTS.KM_S_TO_KPC_MYR;

export function computeBarPotential(R: number, phi: number, bar: BarState): number {
  if (R > 2 * bar.half_length) return 0;
  const x = R / bar.half_length;
  const envelope = x * Math.exp(-x * x);
  const vc = MW.V_CIRC_SUN * KM_S_TO_KPC_MYR;
  return -bar.strength * vc * vc * envelope * Math.cos(2 * (phi - bar.position_angle));
}

export function updateBarState(bar: BarState, stellarPopulations: StellarPopulation[], dt: number): BarState {
  void stellarPopulations;
  const omegaBar = bar.pattern_speed * KM_S_TO_KPC_MYR;
  return {
    ...bar,
    position_angle: (bar.position_angle + omegaBar * dt) % (2 * Math.PI),
    strength: Math.min(0.4, bar.strength * (1 + (0.01 / 1000) * dt)),
    corotation_radius: MW.V_CIRC_SUN / bar.pattern_speed
  };
}

export function updateWarpState(warp: WarpState, haloTorque: number, dt: number): WarpState {
  void haloTorque;
  return {
    ...warp,
    line_of_nodes_angle: (warp.line_of_nodes_angle + warp.precession_rate * dt) % (2 * Math.PI)
  };
}

export function computeRadialMigration(pop: StellarPopulation, spiralArms: SpiralArmState[], dt: number, rng: SeededRNG): GalacticPosition {
  const pos = { ...pop.position };
  for (const arm of spiralArms) {
    const Rcr = MW.V_CIRC_SUN / arm.pattern_speed;
    const d = Math.abs(pos.R - Rcr);
    if (d < 2) {
      const rate = 0.5e-3 * Math.exp(-(d * d) / 2);
      pos.R += rate * dt * arm.amplitude * 10 * rng.nextGaussian();
    }
  }
  pos.R = Math.max(0.1, Math.min(MW.SIMULATION_BOUNDARY, pos.R));
  return pos;
}

export function computeDiskHeating(pop: StellarPopulation, ageIncrement: number, rng: SeededRNG): GalacticVelocity {
  const vel = { ...pop.velocity };
  const beta = 0.35;
  const sigmaOld = 10 * Math.pow(Math.max(pop.age, 1) / 1000, beta);
  const sigmaNew = 10 * Math.pow(Math.max(pop.age + ageIncrement, 1) / 1000, beta);
  const ds = sigmaNew - sigmaOld;
  if (ds > 0) {
    vel.v_R += ds * rng.nextGaussian();
    vel.v_z += ds * 0.6 * rng.nextGaussian();
    vel.v_phi += ds * 0.5 * rng.nextGaussian();
  }
  return vel;
}

export function processFeedback(deathEvents: StellarDeathEvent[], ismGrid: ISMCell[][][], dt: number): FeedbackState {
  void ismGrid;
  let totalEnergy = 0;
  let snCount = 0;
  for (const event of deathEvents) {
    if (event.death_type === "SUPERNOVA_II" || event.death_type === "SUPERNOVA_IA") {
      snCount += 1;
      totalEnergy += event.energy_released;
    }
  }

  const dtCenturies = dt * 1e4;
  const dtSeconds = dt * COSMIC_CONSTANTS.MYR;
  return {
    supernova_rate: dtCenturies > 0 ? snCount / dtCenturies : 0,
    total_energy_injection: dtSeconds > 0 ? totalEnergy / dtSeconds : 0,
    mass_loading_factor: 0.3,
    galactic_fountain_height: totalEnergy > 0 ? Math.min(10, 3 * Math.pow(totalEnergy / 1e51, 0.3)) : 0
  };
}

export function computeSecularEvolution(state: CosmicSimulationState, dt: number): SecularEvolutionState {
  void dt;
  let migrationSum = 0;
  let count = 0;
  for (const pop of state.stellar_populations) {
    if (pop.age > 100 && pop.position.R > 3 && pop.position.R < 15) {
      migrationSum += Math.abs(pop.velocity.v_R) * 1e-3;
      count += 1;
    }
  }

  return {
    radial_migration_rate: count > 0 ? migrationSum / count : 0.5,
    disk_heating_rate: 5.0,
    bar_growth_rate: state.bar.strength < 0.3 ? 0.01 : 0,
    spiral_mode_amplitudes: [0, 0.15, 0, 0.12, 0, 0, 0, 0]
  };
}
