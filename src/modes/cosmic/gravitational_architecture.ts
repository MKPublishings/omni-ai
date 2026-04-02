// =============================================================================
// gravitational_architecture.ts
// Ionirix Cosmic Mode - Milky Way potential and force models
// =============================================================================

import { COSMIC_CONSTANTS } from "./cosmic_constants.ts";
import type {
  CosmicSimulationConfig,
  GalacticPosition,
  GravitationalForce,
  GravitationalPotential,
  MassDistribution
} from "./cosmic_schema.ts";

const MW = COSMIC_CONSTANTS.MW;
const G = COSMIC_CONSTANTS.G;
const DERIV_H = 1e-3;

export function computeHernquistPotential(R: number, z: number, M: number, a: number): number {
  const r = Math.sqrt(R * R + z * z);
  return -G * M / (r + a);
}

export function computeMiyamotoNagaiPotential(R: number, z: number, M: number, a: number, b: number): number {
  const zTerm = Math.sqrt(z * z + b * b);
  const denom = Math.sqrt(R * R + (a + zTerm) * (a + zTerm));
  return -G * M / denom;
}

export function computeNFWPotential(R: number, z: number, Mvir: number, rs: number, c: number): number {
  const r = Math.sqrt(R * R + z * z);
  const fc = Math.log(1 + c) - c / (1 + c);
  if (r < 1e-10) return -G * Mvir / (rs * fc);
  return -G * Mvir * Math.log(1 + r / rs) / (r * fc);
}

export function computeNFWRhoS(Mvir: number, rs: number, c: number): number {
  const fc = Math.log(1 + c) - c / (1 + c);
  return Mvir / (4 * Math.PI * rs * rs * rs * fc);
}

export function computeNFWDensity(r: number, rhoS: number, rs: number): number {
  const x = Math.max(r / rs, 1e-10);
  return rhoS / (x * (1 + x) * (1 + x));
}

export function computeNFWEnclosedMass(r: number, Mvir: number, rs: number, c: number): number {
  const fc = Math.log(1 + c) - c / (1 + c);
  const x = r / rs;
  return Mvir * (Math.log(1 + x) - x / (1 + x)) / fc;
}

export function computeTotalPotential(pos: GalacticPosition): GravitationalPotential {
  const { R, z } = pos;

  const phiThin = computeMiyamotoNagaiPotential(
    R,
    z,
    MW.THIN_DISK_MASS,
    MW.THIN_DISK_SCALE_LENGTH,
    MW.THIN_DISK_SCALE_HEIGHT
  );
  const phiThick = computeMiyamotoNagaiPotential(
    R,
    z,
    MW.THICK_DISK_MASS,
    MW.THICK_DISK_SCALE_LENGTH,
    MW.THICK_DISK_SCALE_HEIGHT
  );
  const phiDisk = phiThin + phiThick;

  const phiBulge = computeHernquistPotential(R, z, MW.BULGE_MASS, MW.BULGE_SCALE_RADIUS);
  const phiHalo = computeNFWPotential(R, z, MW.HALO_VIRIAL_MASS, MW.HALO_SCALE_RADIUS, MW.HALO_CONCENTRATION);

  return {
    phi_total: phiDisk + phiBulge + phiHalo,
    phi_disk: phiDisk,
    phi_bulge: phiBulge,
    phi_halo: phiHalo,
    phi_bar: 0,
    phi_spiral: 0
  };
}

export function computeForce(pos: GalacticPosition): GravitationalForce {
  const { R, phi, z } = pos;
  const h = DERIV_H;

  const phiRp = computeTotalPotential({ R: R + h, phi, z }).phi_total;
  const phiRm = computeTotalPotential({ R: R - h, phi, z }).phi_total;
  const f_R = -(phiRp - phiRm) / (2 * h);

  const phiZp = computeTotalPotential({ R, phi, z: z + h }).phi_total;
  const phiZm = computeTotalPotential({ R, phi, z: z - h }).phi_total;
  const f_z = -(phiZp - phiZm) / (2 * h);

  return { f_R, f_phi: 0, f_z };
}

export function computeCircularVelocity(R: number): number {
  if (R < 1e-10) return 0;
  const force = computeForce({ R, phi: 0, z: 0 });
  return Math.sqrt(Math.abs(force.f_R) * R) * COSMIC_CONSTANTS.KPC_MYR_TO_KM_S;
}

export function computeDensity(pos: GalacticPosition): MassDistribution {
  const { R, z } = pos;
  const r = Math.sqrt(R * R + z * z);

  const rhoS = computeNFWRhoS(MW.HALO_VIRIAL_MASS, MW.HALO_SCALE_RADIUS, MW.HALO_CONCENTRATION);
  const rhoDm = computeNFWDensity(r, rhoS, MW.HALO_SCALE_RADIUS);

  const ab = MW.BULGE_SCALE_RADIUS;
  const rhoBulge = r < 1e-10 ? 0 : (MW.BULGE_MASS * ab) / (2 * Math.PI * r * Math.pow(r + ab, 3));

  const sigma0Gas = MW.GAS_MASS_TOTAL / (2 * Math.PI * MW.GAS_SCALE_LENGTH * MW.GAS_SCALE_LENGTH);
  const sigmaGas = sigma0Gas * Math.exp(-R / MW.GAS_SCALE_LENGTH);
  const zh = MW.GAS_SCALE_HEIGHT_HI;
  const rhoGas = (sigmaGas / (2 * zh)) * Math.pow(1 / Math.cosh(z / zh), 2);

  const sigma0Thin = MW.THIN_DISK_MASS / (2 * Math.PI * MW.THIN_DISK_SCALE_LENGTH * MW.THIN_DISK_SCALE_LENGTH);
  const sigma0Thick = MW.THICK_DISK_MASS / (2 * Math.PI * MW.THICK_DISK_SCALE_LENGTH * MW.THICK_DISK_SCALE_LENGTH);
  const sigmaStars = sigma0Thin * Math.exp(-R / MW.THIN_DISK_SCALE_LENGTH) + sigma0Thick * Math.exp(-R / MW.THICK_DISK_SCALE_LENGTH);
  const rhoStars = rhoBulge + sigmaStars / (2 * MW.THIN_DISK_SCALE_HEIGHT);

  return {
    rho: rhoStars + rhoGas + rhoDm,
    rho_stars: rhoStars,
    rho_gas: rhoGas,
    rho_dm: rhoDm,
    sigma_gas: sigmaGas,
    sigma_stars: sigmaStars
  };
}

export function buildPotentialField(config: CosmicSimulationConfig): GravitationalPotential[][] {
  const Rmax = MW.SIMULATION_BOUNDARY;
  const zMax = 5.0;
  const dR = Rmax / config.radial_bins;
  const dz = (2 * zMax) / config.vertical_bins;

  const field: GravitationalPotential[][] = [];
  for (let i = 0; i < config.radial_bins; i++) {
    field[i] = [];
    for (let j = 0; j < config.vertical_bins; j++) {
      field[i][j] = computeTotalPotential({
        R: (i + 0.5) * dR,
        phi: 0,
        z: -zMax + (j + 0.5) * dz
      });
    }
  }
  return field;
}

export function buildMassDistribution(config: CosmicSimulationConfig): MassDistribution[][] {
  const Rmax = MW.SIMULATION_BOUNDARY;
  const zMax = 5.0;
  const dR = Rmax / config.radial_bins;
  const dz = (2 * zMax) / config.vertical_bins;

  const grid: MassDistribution[][] = [];
  for (let i = 0; i < config.radial_bins; i++) {
    grid[i] = [];
    for (let j = 0; j < config.vertical_bins; j++) {
      grid[i][j] = computeDensity({
        R: (i + 0.5) * dR,
        phi: 0,
        z: -zMax + (j + 0.5) * dz
      });
    }
  }
  return grid;
}

export function computeEnclosedMass(R: number): number {
  const bulge = MW.BULGE_MASS * R * R / Math.pow(R + MW.BULGE_SCALE_RADIUS, 2);
  const halo = computeNFWEnclosedMass(R, MW.HALO_VIRIAL_MASS, MW.HALO_SCALE_RADIUS, MW.HALO_CONCENTRATION);
  const vKpcMyr = computeCircularVelocity(R) * COSMIC_CONSTANTS.KM_S_TO_KPC_MYR;
  const totalApprox = (vKpcMyr * vKpcMyr * Math.max(R, 1e-6)) / G;
  const disk = Math.max(0, totalApprox - bulge - halo);
  return bulge + halo + disk;
}
