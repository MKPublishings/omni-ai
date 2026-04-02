// =============================================================================
// cosmic_schema.ts
// Ionirix Cosmic Mode - Core schema and validation
// =============================================================================

import { COSMIC_CONSTANTS } from "./cosmic_constants.ts";

export enum StellarClass {
  O = "O",
  B = "B",
  A = "A",
  F = "F",
  G = "G",
  K = "K",
  M = "M",
  WD = "WD",
  NS = "NS",
  BH = "BH"
}

export enum StellarEvolutionPhase {
  PROTOSTAR = "PROTOSTAR",
  MAIN_SEQUENCE = "MAIN_SEQUENCE",
  SUBGIANT = "SUBGIANT",
  RED_GIANT = "RED_GIANT",
  HORIZONTAL_BRANCH = "HORIZONTAL_BRANCH",
  ASYMPTOTIC_GIANT = "AGB",
  PLANETARY_NEBULA = "PLANETARY_NEBULA",
  WHITE_DWARF = "WHITE_DWARF",
  SUPERNOVA_II = "SUPERNOVA_II",
  SUPERNOVA_IA = "SUPERNOVA_IA",
  NEUTRON_STAR = "NEUTRON_STAR",
  BLACK_HOLE = "BLACK_HOLE",
  REMNANT = "REMNANT"
}

export enum ISMPhase {
  MOLECULAR = "MOLECULAR",
  COLD_NEUTRAL = "COLD_NEUTRAL",
  WARM_NEUTRAL = "WARM_NEUTRAL",
  WARM_IONIZED = "WARM_IONIZED",
  HOT_IONIZED = "HOT_IONIZED"
}

export enum SpiralArm {
  SCUTUM_CENTAURUS = "SCUTUM_CENTAURUS",
  SAGITTARIUS_CARINA = "SAGITTARIUS_CARINA",
  PERSEUS = "PERSEUS",
  NORMA_OUTER = "NORMA_OUTER",
  LOCAL_SPUR = "LOCAL_SPUR"
}

export interface GalacticPosition {
  R: number;
  phi: number;
  z: number;
}

export interface GalacticVelocity {
  v_R: number;
  v_phi: number;
  v_z: number;
}

export interface GravitationalPotential {
  phi_total: number;
  phi_disk: number;
  phi_bulge: number;
  phi_halo: number;
  phi_bar: number;
  phi_spiral: number;
}

export interface GravitationalForce {
  f_R: number;
  f_phi: number;
  f_z: number;
}

export interface MassDistribution {
  rho: number;
  rho_stars: number;
  rho_gas: number;
  rho_dm: number;
  sigma_gas: number;
  sigma_stars: number;
}

export interface RotationState {
  v_circ: number;
  omega: number;
  kappa: number;
  nu: number;
  oort_A: number;
  oort_B: number;
}

export interface SpiralArmState {
  arm: SpiralArm;
  phase_angle: number;
  amplitude: number;
  pitch_angle: number;
  width: number;
  pattern_speed: number;
  inner_radius: number;
  outer_radius: number;
  is_growing: boolean;
}

export interface SpiralPerturbation {
  delta_phi: number;
  delta_rho: number;
  delta_v_R: number;
  delta_v_phi: number;
}

export interface IMFSample {
  mass_min: number;
  mass_max: number;
  alpha_segments: Array<{
    mass_lower: number;
    mass_upper: number;
    exponent: number;
  }>;
  total_number: number;
  mean_mass: number;
}

export interface StellarPopulation {
  id: string;
  position: GalacticPosition;
  velocity: GalacticVelocity;
  total_mass: number;
  stellar_count: number;
  mean_metallicity: number;
  age: number;
  spectral_class: StellarClass;
  evolution_phase: StellarEvolutionPhase;
  luminosity: number;
  effective_temperature: number;
  mass_function: IMFSample;
}

export interface StarFormationEvent {
  timestamp: number;
  position: GalacticPosition;
  gas_consumed: number;
  stars_formed: number;
  mean_metallicity: number;
  trigger: "KENNICUTT_SCHMIDT" | "SPIRAL_COMPRESSION" | "CLOUD_COLLAPSE" | "FEEDBACK_TRIGGERED";
  population_id: string;
}

export interface StellarDeathEvent {
  timestamp: number;
  population_id: string;
  death_type: "WHITE_DWARF" | "SUPERNOVA_II" | "SUPERNOVA_IA" | "DIRECT_COLLAPSE";
  mass_ejected: number;
  remnant_mass: number;
  energy_released: number;
  metals_ejected: number;
}

export interface ISMCell {
  position: GalacticPosition;
  phase: ISMPhase;
  density: number;
  temperature: number;
  pressure: number;
  magnetic_field: number;
  metallicity: number;
  dust_to_gas_ratio: number;
  column_density_HI: number;
  column_density_H2: number;
  velocity_dispersion: number;
  cooling_rate: number;
  heating_rate: number;
}

export interface ISMGlobalState {
  total_HI_mass: number;
  total_H2_mass: number;
  total_HII_mass: number;
  mean_midplane_pressure: number;
  total_cooling_luminosity: number;
  filling_factors: Record<ISMPhase, number>;
}

export interface BarState {
  half_length: number;
  pattern_speed: number;
  axis_ratio: number;
  position_angle: number;
  strength: number;
  corotation_radius: number;
}

export interface WarpState {
  onset_radius: number;
  maximum_amplitude: number;
  line_of_nodes_angle: number;
  precession_rate: number;
}

export interface FeedbackState {
  supernova_rate: number;
  total_energy_injection: number;
  mass_loading_factor: number;
  galactic_fountain_height: number;
}

export interface SecularEvolutionState {
  radial_migration_rate: number;
  disk_heating_rate: number;
  bar_growth_rate: number;
  spiral_mode_amplitudes: number[];
}

export interface CosmicSimulationConfig {
  seed: number;
  timestep: number;
  total_duration: number;
  spatial_resolution: number;
  radial_bins: number;
  azimuthal_bins: number;
  vertical_bins: number;
  max_stellar_populations: number;
  output_interval: number;
  enable_bar: boolean;
  enable_spiral_arms: boolean;
  enable_star_formation: boolean;
  enable_stellar_feedback: boolean;
  enable_gas_dynamics: boolean;
  enable_warp: boolean;
}

export interface CosmicSimulationState {
  config: CosmicSimulationConfig;
  current_time: number;
  step_count: number;
  gravitational: {
    potential_field: GravitationalPotential[][];
    mass_distribution: MassDistribution[][];
  };
  dynamics: {
    rotation_curve: RotationState[];
  };
  spiral_arms: SpiralArmState[];
  stellar_populations: StellarPopulation[];
  ism: ISMGlobalState;
  ism_grid: ISMCell[][][];
  bar: BarState;
  warp: WarpState;
  feedback: FeedbackState;
  secular: SecularEvolutionState;
  formation_events: StarFormationEvent[];
  death_events: StellarDeathEvent[];
  diagnostics: {
    total_mass: number;
    total_stellar_mass: number;
    total_gas_mass: number;
    total_dark_matter_mass_enclosed: number;
    virial_ratio: number;
    toomre_Q_profile: number[];
    sfr_profile: number[];
    metallicity_gradient: number[];
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SeededRNG {
  seed: number;
  state: number;
  next(): number;
  nextGaussian(): number;
  nextRange(min: number, max: number): number;
  fork(label: string): SeededRNG;
}

export function validateConfig(config: CosmicSimulationConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.timestep <= 0) errors.push("timestep must be positive");
  if (config.total_duration <= 0) errors.push("total_duration must be positive");
  if (config.radial_bins < 10) errors.push("radial_bins must be at least 10");
  if (config.azimuthal_bins < 4) errors.push("azimuthal_bins must be at least 4");
  if (config.vertical_bins < 2) errors.push("vertical_bins must be at least 2");
  if (config.output_interval < config.timestep) errors.push("output_interval must be >= timestep");
  if (config.timestep > 10) warnings.push("timestep > 10 Myr may degrade orbital accuracy");
  if (config.spatial_resolution > 1.0) warnings.push("spatial_resolution > 1 kpc may under-resolve structure");

  return { valid: errors.length === 0, errors, warnings };
}

export function createDefaultSimulationConfig(): CosmicSimulationConfig {
  const mw = COSMIC_CONSTANTS.MW;
  void mw;
  return {
    seed: 42,
    timestep: 1.0,
    total_duration: 1000.0,
    spatial_resolution: 0.5,
    radial_bins: 60,
    azimuthal_bins: 36,
    vertical_bins: 10,
    max_stellar_populations: 10000,
    output_interval: 10.0,
    enable_bar: true,
    enable_spiral_arms: true,
    enable_star_formation: true,
    enable_stellar_feedback: true,
    enable_gas_dynamics: true,
    enable_warp: true
  };
}

export function validateState(state: CosmicSimulationState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (state.current_time < 0) errors.push("current_time cannot be negative");
  if (state.step_count < 0) errors.push("step_count cannot be negative");

  const totalFromComponents =
    state.diagnostics.total_stellar_mass
    + state.diagnostics.total_gas_mass
    + state.diagnostics.total_dark_matter_mass_enclosed;

  if (state.diagnostics.total_mass > 0) {
    const rel = Math.abs(totalFromComponents - state.diagnostics.total_mass) / state.diagnostics.total_mass;
    if (rel > 1e-6) errors.push("diagnostic mass mismatch");
  }

  if (state.diagnostics.virial_ratio < 0.5 || state.diagnostics.virial_ratio > 2.0) {
    warnings.push("virial ratio outside expected range");
  }

  return { valid: errors.length === 0, errors, warnings };
}
