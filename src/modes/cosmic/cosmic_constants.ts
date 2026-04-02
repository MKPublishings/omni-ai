// =============================================================================
// cosmic_constants.ts
// Ionirix Cosmic Mode - Physical constants and Milky Way parameters
// =============================================================================

export const COSMIC_CONSTANTS = {
  G_SI: 6.67430e-11,
  G: 4.4985e-3,
  SOLAR_MASS: 1.989e30,
  KPC: 3.0857e19,
  MYR: 3.1557e13,
  BOLTZMANN: 1.381e-23,
  PROTON_MASS: 1.673e-27,
  SOLAR_LUMINOSITY: 3.828e26,
  KM_S_TO_KPC_MYR: 1.0227e-3,
  KPC_MYR_TO_KM_S: 977.8,
  DEG_TO_RAD: Math.PI / 180,
  RAD_TO_DEG: 180 / Math.PI,
  MW: {
    R_SUN: 8.178,
    V_CIRC_SUN: 229.0,
    Z_SUN: 0.025,
    THIN_DISK_MASS: 3.45e10,
    THIN_DISK_SCALE_LENGTH: 2.6,
    THIN_DISK_SCALE_HEIGHT: 0.3,
    THICK_DISK_MASS: 0.95e10,
    THICK_DISK_SCALE_LENGTH: 3.6,
    THICK_DISK_SCALE_HEIGHT: 0.9,
    BULGE_MASS: 0.91e10,
    BULGE_SCALE_RADIUS: 0.075,
    HALO_VIRIAL_MASS: 6.5e11,
    HALO_SCALE_RADIUS: 19.6,
    HALO_CONCENTRATION: 12.0,
    HALO_VIRIAL_RADIUS: 235.0,
    GAS_MASS_TOTAL: 0.9e10,
    GAS_SCALE_LENGTH: 3.75,
    GAS_SCALE_HEIGHT_HI: 0.15,
    ARM_COUNT: 4,
    PATTERN_SPEED: 23.0,
    ARM_PITCH_ANGLE: 12.0,
    BAR_HALF_LENGTH: 5.0,
    BAR_PATTERN_SPEED: 37.5,
    BAR_ANGLE: 27.0,
    BAR_AXIS_RATIO: 0.4,
    KS_INDEX_SURFACE: 1.4,
    KS_COEFFICIENT: 2.5e-4,
    DISK_TRUNCATION_RADIUS: 25.0,
    SIMULATION_BOUNDARY: 30.0
  }
} as const;

export type CosmicConstantsType = typeof COSMIC_CONSTANTS;
