// =============================================================================
// stellar_formation.ts
// Ionirix Cosmic Mode - Star formation and stellar evolution
// =============================================================================

import { COSMIC_CONSTANTS } from "./cosmic_constants.ts";
import type {
  CosmicSimulationConfig,
  IMFSample,
  ISMCell,
  SeededRNG,
  StarFormationEvent,
  StellarDeathEvent,
  StellarPopulation
} from "./cosmic_schema.ts";
import { ISMPhase, StellarClass, StellarEvolutionPhase } from "./cosmic_schema.ts";

const MW = COSMIC_CONSTANTS.MW;

export function computeSFR(sigmaGas: number, R: number): number {
  if (sigmaGas <= 0) return 0;
  const efficiency = Math.exp(-0.1 * (R - MW.R_SUN));
  const clamped = Math.max(0.1, Math.min(3.0, efficiency));
  return MW.KS_COEFFICIENT * Math.pow(sigmaGas / 1e7, MW.KS_INDEX_SURFACE) * clamped;
}

const KROUPA_SEGMENTS = [
  { mass_lower: 0.01, mass_upper: 0.08, exponent: 0.3 },
  { mass_lower: 0.08, mass_upper: 0.5, exponent: 1.3 },
  { mass_lower: 0.5, mass_upper: 150.0, exponent: 2.3 }
];

export function sampleIMF(totalMass: number, rng: SeededRNG): IMFSample {
  void rng;
  const C = [1.0, 0, 0];
  C[1] = C[0] * Math.pow(0.08, -0.3) / Math.pow(0.08, -1.3);
  C[2] = C[1] * Math.pow(0.5, -1.3) / Math.pow(0.5, -2.3);

  let numberIntegral = 0;
  let massIntegral = 0;
  for (let i = 0; i < KROUPA_SEGMENTS.length; i++) {
    const seg = KROUPA_SEGMENTS[i];
    const expN = 1 - seg.exponent;
    const expM = 2 - seg.exponent;
    numberIntegral += C[i] * (Math.pow(seg.mass_upper, expN) - Math.pow(seg.mass_lower, expN)) / expN;
    massIntegral += C[i] * (Math.pow(seg.mass_upper, expM) - Math.pow(seg.mass_lower, expM)) / expM;
  }

  const meanMass = massIntegral / numberIntegral;
  return {
    mass_min: 0.01,
    mass_max: 150,
    alpha_segments: KROUPA_SEGMENTS,
    total_number: Math.max(1, Math.round(totalMass / meanMass)),
    mean_mass: meanMass
  };
}

export function computeMainSequenceLifetime(mass: number): number {
  if (mass <= 0) return 0;
  if (mass <= 0.5) return 15_000_000;
  return 10_000 * Math.pow(mass, -2.5);
}

export function classifySpectralType(temperature: number): StellarClass {
  if (temperature >= 30000) return StellarClass.O;
  if (temperature >= 10000) return StellarClass.B;
  if (temperature >= 7500) return StellarClass.A;
  if (temperature >= 6000) return StellarClass.F;
  if (temperature >= 5200) return StellarClass.G;
  if (temperature >= 3700) return StellarClass.K;
  return StellarClass.M;
}

export function classifyStellarEvolution(mass: number, age: number): StellarEvolutionPhase {
  const lifetime = computeMainSequenceLifetime(mass);
  const f = age / Math.max(lifetime, 1e-6);
  if (f < 0.001) return StellarEvolutionPhase.PROTOSTAR;
  if (f < 1.0) return StellarEvolutionPhase.MAIN_SEQUENCE;
  if (f < 1.05) return StellarEvolutionPhase.SUBGIANT;
  if (f < 1.2) return StellarEvolutionPhase.RED_GIANT;
  if (mass >= 25) return StellarEvolutionPhase.BLACK_HOLE;
  if (mass >= 8) return StellarEvolutionPhase.NEUTRON_STAR;
  if (mass >= 1) return StellarEvolutionPhase.PLANETARY_NEBULA;
  return StellarEvolutionPhase.WHITE_DWARF;
}

export function evolvePopulation(pop: StellarPopulation, dt: number): StellarPopulation {
  const newAge = pop.age + dt;
  const repMass = pop.mass_function.mean_mass;
  const phase = classifyStellarEvolution(repMass, newAge);
  const temp = Math.max(2500, 5778 * Math.pow(Math.max(repMass, 0.08), 0.57));
  return {
    ...pop,
    age: newAge,
    evolution_phase: phase,
    effective_temperature: temp,
    spectral_class: classifySpectralType(temp)
  };
}

function computeGasSurfaceDensity(R: number): number {
  const sigma0 = MW.GAS_MASS_TOTAL / (2 * Math.PI * MW.GAS_SCALE_LENGTH * MW.GAS_SCALE_LENGTH);
  return sigma0 * Math.exp(-R / MW.GAS_SCALE_LENGTH);
}

export function processStarFormation(
  ismGrid: ISMCell[][][],
  config: CosmicSimulationConfig,
  rng: SeededRNG,
  time: number
): StarFormationEvent[] {
  const events: StarFormationEvent[] = [];
  if (!config.enable_star_formation) return events;

  for (let i = 0; i < ismGrid.length; i++) {
    for (let j = 0; j < ismGrid[i].length; j++) {
      for (let k = 0; k < ismGrid[i][j].length; k++) {
        const cell = ismGrid[i][j][k];
        if (cell.phase !== ISMPhase.MOLECULAR && cell.phase !== ISMPhase.COLD_NEUTRAL) continue;
        if (cell.density < 100) continue;

        const sigmaGas = computeGasSurfaceDensity(cell.position.R);
        const sfr = computeSFR(sigmaGas, cell.position.R);
        const cellVolume = Math.pow(config.spatial_resolution, 3);
        const massFormed = sfr * cellVolume * config.timestep * 1e6;
        if (massFormed < 100) continue;

        const prob = 1 - Math.exp(-massFormed / 1e4);
        if (rng.next() > prob) continue;
        const actualMass = massFormed * (0.5 + rng.next());

        events.push({
          timestamp: time,
          position: { ...cell.position },
          gas_consumed: actualMass / 0.3,
          stars_formed: actualMass,
          mean_metallicity: cell.metallicity > 0 ? Math.log10(cell.metallicity) : -1,
          trigger: cell.density > 1000 ? "CLOUD_COLLAPSE" : "KENNICUTT_SCHMIDT",
          population_id: `pop_${time.toFixed(1)}_${i}_${j}_${k}`
        });
      }
    }
  }

  return events;
}

export function processStellarDeath(populations: StellarPopulation[], time: number): StellarDeathEvent[] {
  const events: StellarDeathEvent[] = [];
  const tau8 = computeMainSequenceLifetime(8.0);
  const tau1 = computeMainSequenceLifetime(1.0);

  for (const pop of populations) {
    if (pop.age > tau8 && pop.age < tau8 + 50) {
      const snMass = pop.total_mass * 0.003;
      if (snMass > 0.1) {
        events.push({
          timestamp: time,
          population_id: pop.id,
          death_type: "SUPERNOVA_II",
          mass_ejected: snMass * 0.8,
          remnant_mass: snMass * 0.2,
          energy_released: (snMass / 10) * 1e51,
          metals_ejected: snMass * 0.1
        });
      }
    }

    if (pop.age > tau1) {
      const wdMass = pop.total_mass * 0.15;
      if (wdMass > 1) {
        events.push({
          timestamp: time,
          population_id: pop.id,
          death_type: "WHITE_DWARF",
          mass_ejected: wdMass * 0.6,
          remnant_mass: wdMass * 0.4,
          energy_released: wdMass * 1e46,
          metals_ejected: wdMass * 0.02
        });
      }
    }
  }

  return events;
}
