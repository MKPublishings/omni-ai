// =============================================================================
// cosmic_engine.ts
// Ionirix Cosmic Mode - Simulation orchestrator
// =============================================================================

import { COSMIC_CONSTANTS } from "./cosmic_constants.ts";
import type {
  CosmicSimulationConfig,
  CosmicSimulationState,
  ISMPhase,
  SeededRNG,
  StellarPopulation
} from "./cosmic_schema.ts";
import { createDefaultSimulationConfig } from "./cosmic_schema.ts";
import { StellarClass, StellarEvolutionPhase } from "./cosmic_schema.ts";
import { Mulberry32RNG } from "./rng.ts";
import { buildMassDistribution, buildPotentialField, computeCircularVelocity, computeNFWEnclosedMass } from "./gravitational_architecture.ts";
import { computeRotationCurve, computeRotationState, computeToomreQ } from "./galactic_dynamics.ts";
import { initializeSpiralArms, updateSpiralArms } from "./spiral_arm_dynamics.ts";
import { evolvePopulation, processStarFormation, processStellarDeath, sampleIMF, computeSFR } from "./stellar_formation.ts";
import { initializeISMGrid, updateISMCell, updateISMGlobalState, computeGasSurfaceDensity } from "./interstellar_medium.ts";
import { computeDiskHeating, computeRadialMigration, computeSecularEvolution, processFeedback, updateBarState, updateWarpState } from "./emergent_behavior.ts";

const MW = COSMIC_CONSTANTS.MW;

export class CosmicEngine {
  private config: CosmicSimulationConfig;
  private state: CosmicSimulationState;
  private rng: SeededRNG;

  public onStep?: (state: CosmicSimulationState) => void;
  public onSnapshot?: (state: CosmicSimulationState) => void;

  constructor(config?: CosmicSimulationConfig) {
    this.config = config ?? createDefaultSimulationConfig();
    this.rng = new Mulberry32RNG(this.config.seed);
    this.state = {
      config: this.config,
      current_time: 0,
      step_count: 0,
      gravitational: { potential_field: [], mass_distribution: [] },
      dynamics: { rotation_curve: [] },
      spiral_arms: [],
      stellar_populations: [],
      ism: {
        total_HI_mass: 0,
        total_H2_mass: 0,
        total_HII_mass: 0,
        mean_midplane_pressure: 0,
        total_cooling_luminosity: 0,
        filling_factors: {} as Record<ISMPhase, number>
      },
      ism_grid: [],
      bar: {
        half_length: MW.BAR_HALF_LENGTH,
        pattern_speed: MW.BAR_PATTERN_SPEED,
        axis_ratio: MW.BAR_AXIS_RATIO,
        position_angle: MW.BAR_ANGLE * COSMIC_CONSTANTS.DEG_TO_RAD,
        strength: 0.15,
        corotation_radius: MW.V_CIRC_SUN / MW.BAR_PATTERN_SPEED
      },
      warp: {
        onset_radius: 15,
        maximum_amplitude: 1.5,
        line_of_nodes_angle: 0.75 * Math.PI,
        precession_rate: (2 * Math.PI) / 1000
      },
      feedback: {
        supernova_rate: 0,
        total_energy_injection: 0,
        mass_loading_factor: 0.3,
        galactic_fountain_height: 0
      },
      secular: {
        radial_migration_rate: 0.5,
        disk_heating_rate: 5,
        bar_growth_rate: 0.01,
        spiral_mode_amplitudes: [0, 0.15, 0, 0.12, 0, 0, 0, 0]
      },
      formation_events: [],
      death_events: [],
      diagnostics: {
        total_mass: 0,
        total_stellar_mass: 0,
        total_gas_mass: 0,
        total_dark_matter_mass_enclosed: 0,
        virial_ratio: 1,
        toomre_Q_profile: [],
        sfr_profile: [],
        metallicity_gradient: []
      }
    };
  }

  public initialize(): void {
    this.state.gravitational.potential_field = buildPotentialField(this.config);
    this.state.gravitational.mass_distribution = buildMassDistribution(this.config);
    this.state.dynamics.rotation_curve = computeRotationCurve(0.5, MW.SIMULATION_BOUNDARY, this.config.radial_bins);
    if (this.config.enable_spiral_arms) this.state.spiral_arms = initializeSpiralArms();
    if (this.config.enable_gas_dynamics) {
      this.state.ism_grid = initializeISMGrid(this.config);
      this.state.ism = updateISMGlobalState(this.state.ism_grid);
    }
    this.updateDiagnostics();
  }

  public step(): void {
    const dt = this.config.timestep;
    const t = this.state.current_time;
    this.state.formation_events = [];
    this.state.death_events = [];

    if (this.state.step_count % 10 === 0) {
      this.state.gravitational.potential_field = buildPotentialField(this.config);
      this.state.gravitational.mass_distribution = buildMassDistribution(this.config);
    }

    if (this.config.enable_spiral_arms) {
      this.state.spiral_arms = updateSpiralArms(this.state.spiral_arms, dt);
    }

    if (this.config.enable_star_formation && this.state.ism_grid.length > 0) {
      const sfRng = this.rng.fork(`sf_${this.state.step_count}`);
      this.state.formation_events = processStarFormation(this.state.ism_grid, this.config, sfRng, t);

      for (const event of this.state.formation_events) {
        if (this.state.stellar_populations.length >= this.config.max_stellar_populations) break;
        const imf = sampleIMF(event.stars_formed, sfRng.fork(event.population_id));
        const newPop: StellarPopulation = {
          id: event.population_id,
          position: { ...event.position },
          velocity: { v_R: 0, v_phi: computeCircularVelocity(event.position.R), v_z: 0 },
          total_mass: event.stars_formed,
          stellar_count: imf.total_number,
          mean_metallicity: event.mean_metallicity,
          age: 0,
          spectral_class: StellarClass.O,
          evolution_phase: StellarEvolutionPhase.MAIN_SEQUENCE,
          luminosity: event.stars_formed * 10,
          effective_temperature: 15000,
          mass_function: imf
        };
        this.state.stellar_populations.push(newPop);
      }
    }

    for (let i = 0; i < this.state.stellar_populations.length; i++) {
      const pop = evolvePopulation(this.state.stellar_populations[i], dt);
      const emRng = this.rng.fork(`em_${this.state.step_count}_${pop.id}`);
      const migrated = this.config.enable_spiral_arms ? computeRadialMigration(pop, this.state.spiral_arms, dt, emRng) : pop.position;
      const heated = computeDiskHeating(pop, dt, emRng);
      this.state.stellar_populations[i] = { ...pop, position: migrated, velocity: heated };
    }

    this.state.death_events = processStellarDeath(this.state.stellar_populations, t);

    if (this.config.enable_gas_dynamics && this.state.ism_grid.length > 0) {
      let totalFeedbackEnergy = 0;
      for (const event of this.state.death_events) totalFeedbackEnergy += event.energy_released;

      let totalCells = 0;
      for (const rs of this.state.ism_grid) for (const ps of rs) totalCells += ps.length;
      const energyPerCell = totalCells > 0 ? totalFeedbackEnergy / totalCells : 0;

      for (let i = 0; i < this.state.ism_grid.length; i++) {
        for (let j = 0; j < this.state.ism_grid[i].length; j++) {
          for (let k = 0; k < this.state.ism_grid[i][j].length; k++) {
            this.state.ism_grid[i][j][k] = updateISMCell(this.state.ism_grid[i][j][k], dt, energyPerCell, 0);
          }
        }
      }
      this.state.ism = updateISMGlobalState(this.state.ism_grid);
    }

    if (this.config.enable_bar) this.state.bar = updateBarState(this.state.bar, this.state.stellar_populations, dt);
    if (this.config.enable_warp) this.state.warp = updateWarpState(this.state.warp, 0, dt);
    if (this.config.enable_stellar_feedback) this.state.feedback = processFeedback(this.state.death_events, this.state.ism_grid, dt);

    this.state.secular = computeSecularEvolution(this.state, dt);
    this.updateDiagnostics();

    this.state.current_time += dt;
    this.state.step_count += 1;
    this.onStep?.(this.state);

    if (this.config.output_interval > 0 && Math.abs(this.state.current_time % this.config.output_interval) < dt * 0.5) {
      this.onSnapshot?.(this.state);
    }
  }

  public run(steps?: number): void {
    const maxSteps = steps ?? Math.ceil(this.config.total_duration / this.config.timestep);
    for (let i = 0; i < maxSteps; i++) {
      if (this.state.current_time >= this.config.total_duration) break;
      this.step();
    }
  }

  public getState(): CosmicSimulationState {
    return JSON.parse(JSON.stringify(this.state)) as CosmicSimulationState;
  }

  public serialize(): string {
    return JSON.stringify({ config: this.config, rng_state: this.rng.state, state: this.state });
  }

  public static deserialize(serialized: string): CosmicEngine {
    const data = JSON.parse(serialized) as { config: CosmicSimulationConfig; rng_state: number; state: CosmicSimulationState };
    const engine = new CosmicEngine(data.config);
    (engine.rng as Mulberry32RNG).state = data.rng_state;
    engine.state = data.state;
    return engine;
  }

  private updateDiagnostics(): void {
    const d = this.state.diagnostics;
    d.total_stellar_mass = this.state.stellar_populations.reduce((s, p) => s + p.total_mass, 0);
    d.total_gas_mass = this.state.ism.total_HI_mass + this.state.ism.total_H2_mass + this.state.ism.total_HII_mass;
    if (d.total_gas_mass <= 0) d.total_gas_mass = MW.GAS_MASS_TOTAL;

    d.total_dark_matter_mass_enclosed = computeNFWEnclosedMass(
      MW.SIMULATION_BOUNDARY,
      MW.HALO_VIRIAL_MASS,
      MW.HALO_SCALE_RADIUS,
      MW.HALO_CONCENTRATION
    );

    d.total_mass = d.total_stellar_mass + d.total_gas_mass + d.total_dark_matter_mass_enclosed;

    const vCirc = computeCircularVelocity(MW.R_SUN) * COSMIC_CONSTANTS.KM_S_TO_KPC_MYR;
    const kinetic = 0.5 * d.total_stellar_mass * vCirc * vCirc;
    const potential = Math.abs((COSMIC_CONSTANTS.G * d.total_mass * d.total_mass) / (2 * MW.R_SUN));
    d.virial_ratio = potential > 0 ? (2 * kinetic) / potential : 1;

    d.toomre_Q_profile = [];
    d.sfr_profile = [];
    d.metallicity_gradient = [];

    const dR = MW.SIMULATION_BOUNDARY / this.config.radial_bins;
    for (let i = 0; i < this.config.radial_bins; i++) {
      const R = (i + 0.5) * dR;
      const rot = computeRotationState(R);
      const sigmaGas = computeGasSurfaceDensity(R);
      const sigmaR = 40 * Math.exp(-(R - MW.R_SUN) / 8);
      d.toomre_Q_profile.push(computeToomreQ(R, sigmaR, rot.kappa, sigmaGas));
      d.sfr_profile.push(computeSFR(sigmaGas, R));
      d.metallicity_gradient.push(-0.05 * (R - MW.R_SUN));
    }
  }
}
