// =============================================================================
// interstellar_medium.ts
// Ionirix Cosmic Mode - Multi-phase interstellar medium model
// =============================================================================

import { COSMIC_CONSTANTS } from "./cosmic_constants.ts";
import type { CosmicSimulationConfig, ISMCell, ISMGlobalState } from "./cosmic_schema.ts";
import { ISMPhase } from "./cosmic_schema.ts";

const MW = COSMIC_CONSTANTS.MW;
const kB = COSMIC_CONSTANTS.BOLTZMANN;

export function computeCoolingRate(T: number, n: number, Z: number): number {
  if (T <= 0 || n <= 0) return 0;
  const zFactor = Math.max(0.01, Z);
  let lambdaN = 0;

  if (T < 200) lambdaN = 1e-33 * Math.pow(T, 3) * zFactor;
  else if (T < 2000) lambdaN = 2e-26 * Math.pow(T, 0.5) * zFactor;
  else if (T < 8000) lambdaN = 7e-27 * Math.pow(T / 1e4, 1.7) * zFactor;
  else if (T < 2e4) lambdaN = 7e-22 * Math.exp(-1.18e5 / T) * zFactor;
  else if (T < 1e5) lambdaN = 1.5e-22 * Math.pow(T / 1e5, -0.7) * zFactor;
  else if (T < 1e7) lambdaN = 4e-23 * Math.pow(T / 1e6, -0.7) * zFactor;
  else lambdaN = 2.7e-27 * Math.pow(T, 0.5);

  return lambdaN * n * n;
}

export function computeHeatingRate(n: number, G0 = 1.0, zetaCR = 2e-16): number {
  if (n <= 0) return 0;
  const gammaPE = 1.0e-25 * n * G0;
  const gammaCR = zetaCR * n * 6.0e-28;
  return gammaPE + gammaCR;
}

export function determineISMPhase(T: number, n: number): ISMPhase {
  if (T < 50 && n > 300) return ISMPhase.MOLECULAR;
  if (T < 200 && n > 10) return ISMPhase.COLD_NEUTRAL;
  if (T < 10000 && n < 1) return ISMPhase.WARM_NEUTRAL;
  if (T < 50000) return ISMPhase.WARM_IONIZED;
  return ISMPhase.HOT_IONIZED;
}

export function computeThermalEquilibrium(n: number, G0: number, zetaCR: number, Z: number): number {
  const heating = computeHeatingRate(n, G0, zetaCR);
  let lo = 10;
  let hi = 1e7;

  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    const net = computeCoolingRate(mid, n, Z) - heating;
    if (net > 0) hi = mid;
    else lo = mid;
  }

  return Math.sqrt(lo * hi);
}

export function computeMolecularFraction(sigmaGas: number, Z: number): number {
  const sigmaPc = sigmaGas / 1e6;
  const tau = sigmaPc * Z * 0.066;
  const s = Math.log(1 + 0.6 * tau + 0.01 * tau * tau) / (0.6 * tau + 1e-10);
  return Math.max(0, Math.min(1, 1 - (0.75 * s) / (1 + 0.25 * s)));
}

export function computeGasSurfaceDensity(R: number): number {
  const sigma0 = MW.GAS_MASS_TOTAL / (2 * Math.PI * MW.GAS_SCALE_LENGTH * MW.GAS_SCALE_LENGTH);
  return sigma0 * Math.exp(-R / MW.GAS_SCALE_LENGTH);
}

export function initializeISMGrid(config: CosmicSimulationConfig): ISMCell[][][] {
  const Rmax = MW.SIMULATION_BOUNDARY;
  const zMax = 2.0;
  const dR = Rmax / config.radial_bins;
  const dPhi = (2 * Math.PI) / config.azimuthal_bins;
  const dz = (2 * zMax) / config.vertical_bins;

  const grid: ISMCell[][][] = [];
  for (let i = 0; i < config.radial_bins; i++) {
    const R = (i + 0.5) * dR;
    grid[i] = [];
    for (let j = 0; j < config.azimuthal_bins; j++) {
      const phi = (j + 0.5) * dPhi;
      grid[i][j] = [];
      for (let k = 0; k < config.vertical_bins; k++) {
        const z = -zMax + (k + 0.5) * dz;
        const sigmaR = computeGasSurfaceDensity(R);
        const rhoGas = (sigmaR / (2 * MW.GAS_SCALE_HEIGHT_HI)) * Math.pow(1 / Math.cosh(z / MW.GAS_SCALE_HEIGHT_HI), 2);
        const n = rhoGas * 4.05e-5;
        const G0 = Math.exp(-(R - MW.R_SUN) / 4.0);
        const Zsolar = Math.pow(10, -0.05 * (R - MW.R_SUN));
        const T = computeThermalEquilibrium(n, G0, 2e-16, Zsolar);
        const fMol = computeMolecularFraction(sigmaR, Zsolar);

        grid[i][j][k] = {
          position: { R, phi, z },
          phase: determineISMPhase(T, n),
          density: n,
          temperature: T,
          pressure: n * kB * T,
          magnetic_field: 6.0 * Math.exp(-R / 8.0),
          metallicity: Zsolar,
          dust_to_gas_ratio: 0.01 * Zsolar,
          column_density_HI: (1 - fMol) * sigmaR * 1.25e20,
          column_density_H2: fMol * sigmaR * 1.25e20,
          velocity_dispersion: 7 + 3 * Math.exp(-R / 5),
          cooling_rate: computeCoolingRate(T, n, Zsolar),
          heating_rate: computeHeatingRate(n, G0, 2e-16)
        };
      }
    }
  }
  return grid;
}

export function updateISMCell(cell: ISMCell, dt: number, feedbackEnergy: number, radiationChange: number): ISMCell {
  const dtS = dt * COSMIC_CONSTANTS.MYR;
  const netRate = cell.heating_rate - cell.cooling_rate + feedbackEnergy / Math.max(dtS, 1e-30);
  const dT = (netRate * dtS * (2 / 3)) / Math.max(cell.density * kB, 1e-30);
  const newT = Math.max(3, Math.min(1e8, cell.temperature + dT));
  const G0 = Math.max(0.01, 1 + radiationChange);

  return {
    ...cell,
    temperature: newT,
    phase: determineISMPhase(newT, cell.density),
    pressure: cell.density * kB * newT,
    cooling_rate: computeCoolingRate(newT, cell.density, cell.metallicity),
    heating_rate: computeHeatingRate(cell.density, G0, 2e-16)
  };
}

export function updateISMGlobalState(grid: ISMCell[][][]): ISMGlobalState {
  let totalHI = 0;
  let totalH2 = 0;
  let totalHII = 0;
  let totalCooling = 0;
  let pressureSum = 0;
  let midplaneCount = 0;
  let totalCells = 0;

  const phaseCounts: Record<ISMPhase, number> = {
    [ISMPhase.MOLECULAR]: 0,
    [ISMPhase.COLD_NEUTRAL]: 0,
    [ISMPhase.WARM_NEUTRAL]: 0,
    [ISMPhase.WARM_IONIZED]: 0,
    [ISMPhase.HOT_IONIZED]: 0
  };

  for (const rSlice of grid) {
    for (const phiSlice of rSlice) {
      for (const cell of phiSlice) {
        totalCells += 1;
        phaseCounts[cell.phase] += 1;
        totalCooling += cell.cooling_rate;
        if (Math.abs(cell.position.z) < 0.1) {
          pressureSum += cell.pressure / kB;
          midplaneCount += 1;
        }

        if (cell.phase === ISMPhase.MOLECULAR) totalH2 += cell.density;
        else if (cell.phase === ISMPhase.WARM_IONIZED || cell.phase === ISMPhase.HOT_IONIZED) totalHII += cell.density;
        else totalHI += cell.density;
      }
    }
  }

  const filling = {
    [ISMPhase.MOLECULAR]: totalCells > 0 ? phaseCounts[ISMPhase.MOLECULAR] / totalCells : 0,
    [ISMPhase.COLD_NEUTRAL]: totalCells > 0 ? phaseCounts[ISMPhase.COLD_NEUTRAL] / totalCells : 0,
    [ISMPhase.WARM_NEUTRAL]: totalCells > 0 ? phaseCounts[ISMPhase.WARM_NEUTRAL] / totalCells : 0,
    [ISMPhase.WARM_IONIZED]: totalCells > 0 ? phaseCounts[ISMPhase.WARM_IONIZED] / totalCells : 0,
    [ISMPhase.HOT_IONIZED]: totalCells > 0 ? phaseCounts[ISMPhase.HOT_IONIZED] / totalCells : 0
  };

  return {
    total_HI_mass: totalHI * 2.47e4,
    total_H2_mass: totalH2 * 2.47e4,
    total_HII_mass: totalHII * 2.47e4,
    mean_midplane_pressure: midplaneCount > 0 ? pressureSum / midplaneCount : 3000,
    total_cooling_luminosity: (totalCooling * 1e-7) / COSMIC_CONSTANTS.SOLAR_LUMINOSITY,
    filling_factors: filling
  };
}
