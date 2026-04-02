# IONIRIX ARCHITECTURE DIVISION
# IONIRIX COSMIC MODE
## Milky Way-Scale Galactic Simulation Engine
### Complete Implementation Document (Continuation)

Version: 1.0.0  
Classification: Sovereign / Internal  
Date: April 2, 2026  
Author: Ionirix Architecture Division  
Document ID: ION-COSMIC-IMPL-2026-001

---

## 11.2 Source File: cosmic_mode.ts

```ts
// =============================================================================
// cosmic_mode.ts
// Ionirix Cosmic Mode - Public Entry Point
// Version 1.0.0 | Deterministic | Sovereign
// =============================================================================

import { CosmicSimulationConfig } from './cosmic_schema';
import { CosmicModeAdapter } from './cosmic_integration';

/** Cosmic Mode version string. */
export const COSMIC_MODE_VERSION = '1.0.0';

/**
 * Create a default simulation configuration suitable for a
 * medium-resolution Milky Way simulation.
 */
export function createDefaultConfig(): CosmicSimulationConfig {
  return {
    seed: 42,
    timestep: 1.0,
    total_duration: 1000.0,
    spatial_resolution: 0.5,
    radial_bins: 60,
    azimuthal_bins: 36,
    vertical_bins: 10,
    max_stellar_populations: 10_000,
    output_interval: 10.0,
    enable_bar: true,
    enable_spiral_arms: true,
    enable_star_formation: true,
    enable_stellar_feedback: true,
    enable_gas_dynamics: true,
    enable_warp: true,
  };
}

/**
 * Initialize Cosmic Mode with optional configuration overrides.
 */
export function initializeCosmicMode(
  overrides?: Partial<CosmicSimulationConfig>
): CosmicModeAdapter {
  const config = { ...createDefaultConfig(), ...overrides };
  const adapter = new CosmicModeAdapter(config);
  adapter.initialize();
  return adapter;
}

// Public re-exports
export {
  CosmicModeAdapter,
  CosmicSimulationConfig,
  CosmicSimulationState,
  GalacticPosition,
  GalacticVelocity,
  StellarPopulation,
  StarFormationEvent,
  StellarDeathEvent,
} from './cosmic_schema';

export { CosmicEngine } from './cosmic_engine';
export { CosmicEventBus, CosmicEvent, CosmicEventType } from './cosmic_integration';
```

---

## 12. Seeded RNG Implementation

### 12.1 Source File: rng.ts

```ts
// =============================================================================
// rng.ts
// Ionirix Cosmic Mode - Deterministic Seeded PRNG (Mulberry32)
// Version 1.0.0 | Deterministic | Sovereign
// =============================================================================

import { SeededRNG } from './cosmic_schema';

/**
 * Mulberry32 - fast deterministic 32-bit PRNG.
 * Period: 2^32.
 */
export class Mulberry32RNG implements SeededRNG {
  public seed: number;
  public state: number;

  constructor(seed: number) {
    this.seed = seed | 0;
    this.state = seed | 0;
  }

  /** Return next uniform sample in [0, 1). */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Return next Gaussian sample N(0, 1) using Box-Muller transform. */
  public nextGaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1 + 1e-30)) * Math.cos(2 * Math.PI * u2);
  }

  /** Return uniform sample in [min, max). */
  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Create deterministic child RNG keyed by label. */
  public fork(label: string): SeededRNG {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = (Math.imul(hash, 31) + label.charCodeAt(i)) | 0;
    }
    return new Mulberry32RNG(this.seed ^ hash);
  }
}
```

### 12.2 Determinism Contract

1. All stochastic operations must consume randomness only via SeededRNG.
2. Module-level random calls must use fork() with stable labels.
3. No use of Math.random() is permitted anywhere in Cosmic Mode.
4. Serialization must preserve RNG state exactly for bit-identical continuation.

---

## 13. Diagnostics and Validation

### 13.1 Source File: diagnostics.ts

```ts
// =============================================================================
// diagnostics.ts
// Ionirix Cosmic Mode - Diagnostic Functions
// Version 1.0.0 | Deterministic | Sovereign
// =============================================================================

import { COSMIC_CONSTANTS } from './cosmic_constants';
import { CosmicSimulationState } from './cosmic_schema';
import { computeCircularVelocity } from './gravitational_architecture';
import { computeRotationState, computeToomreQ } from './galactic_dynamics';
import { computeSFR } from './stellar_formation';
import { computeGasSurfaceDensity } from './interstellar_medium';

const MW = COSMIC_CONSTANTS.MW;

/** Virial ratio 2T/|W|. */
export function computeVirialRatio(state: CosmicSimulationState): number {
  const v = computeCircularVelocity(MW.R_SUN) * COSMIC_CONSTANTS.KM_S_TO_KPC_MYR;
  const T = 0.5 * state.diagnostics.total_stellar_mass * v * v;
  const W =
    (COSMIC_CONSTANTS.G * state.diagnostics.total_mass * state.diagnostics.total_mass) /
    (2 * MW.R_SUN);
  return W > 0 ? (2 * T) / W : 1.0;
}

/** Component mass checksum. */
export function computeTotalMass(state: CosmicSimulationState): number {
  return (
    state.diagnostics.total_stellar_mass +
    state.diagnostics.total_gas_mass +
    state.diagnostics.total_dark_matter_mass_enclosed
  );
}

/** Energy proxy conservation check between two states. */
export function validateEnergyConservation(
  before: CosmicSimulationState,
  after: CosmicSimulationState
): { delta_E: number; relative_error: number } {
  const E_before = before.diagnostics.total_mass;
  const E_after = after.diagnostics.total_mass;
  const delta_E = E_after - E_before;
  const relative_error = E_before > 0 ? Math.abs(delta_E) / E_before : 0;
  return { delta_E, relative_error };
}

/** Approximate angular momentum around z-axis. */
export function computeAngularMomentum(state: CosmicSimulationState): number {
  let Lz = 0;
  for (const p of state.stellar_populations) {
    Lz += p.total_mass * p.position.R * p.velocity.v_phi * COSMIC_CONSTANTS.KM_S_TO_KPC_MYR;
  }
  return Lz;
}

/** Radial profiles used by diagnostics and plotting. */
export function computeRadialProfiles(state: CosmicSimulationState): {
  R: number[];
  v_circ: number[];
  sigma_gas: number[];
  sfr: number[];
  metallicity: number[];
  toomre_Q: number[];
} {
  const bins = state.config.radial_bins;
  const dR = MW.SIMULATION_BOUNDARY / bins;

  const R: number[] = [];
  const v_circ: number[] = [];
  const sigma_gas: number[] = [];
  const sfr: number[] = [];
  const metallicity: number[] = [];
  const toomre_Q: number[] = [];

  for (let i = 0; i < bins; i++) {
    const r = (i + 0.5) * dR;
    const rot = computeRotationState(r);
    const sigGas = computeGasSurfaceDensity(r);
    const sigR = 40 * Math.exp(-(r - MW.R_SUN) / 8.0);

    R.push(r);
    v_circ.push(rot.v_circ);
    sigma_gas.push(sigGas);
    sfr.push(computeSFR(sigGas, r));
    metallicity.push(-0.05 * (r - MW.R_SUN));
    toomre_Q.push(computeToomreQ(r, sigR, rot.kappa, sigGas));
  }

  return { R, v_circ, sigma_gas, sfr, metallicity, toomre_Q };
}

/** Human-readable diagnostics report. */
export function generateDiagnosticReport(state: CosmicSimulationState): string {
  const d = state.diagnostics;
  const lines = [
    '=== COSMIC MODE DIAGNOSTIC REPORT ===',
    `Time: ${state.current_time.toFixed(1)} Myr (step ${state.step_count})`,
    `Total mass: ${d.total_mass.toExponential(4)} M_sun`,
    `Stellar mass: ${d.total_stellar_mass.toExponential(4)} M_sun`,
    `Gas mass: ${d.total_gas_mass.toExponential(4)} M_sun`,
    `DM enclosed: ${d.total_dark_matter_mass_enclosed.toExponential(4)} M_sun`,
    `Virial ratio: ${d.virial_ratio.toFixed(4)}`,
    `Populations: ${state.stellar_populations.length}`,
    `Formation events (step): ${state.formation_events.length}`,
    `Death events (step): ${state.death_events.length}`,
    `SN rate: ${state.feedback.supernova_rate.toFixed(3)} per century`,
    `Bar strength: ${state.bar.strength.toFixed(4)}`,
    '=== END REPORT ===',
  ];
  return lines.join('\n');
}
```

### 13.2 Validation Checklist

1. Mass closure error < 1e-6 relative.
2. Virial ratio remains in [0.5, 2.0] for quasi-equilibrium test runs.
3. Circular speed at solar radius remains in observational band.
4. Determinism pass: same seed yields byte-identical state snapshots.

---

## 14. File Manifest and Directory Structure

```text
ionirix/
  src/
    modes/
      cosmic/
        cosmic_constants.ts
        cosmic_schema.ts
        gravitational_architecture.ts
        galactic_dynamics.ts
        spiral_arm_dynamics.ts
        stellar_formation.ts
        interstellar_medium.ts
        emergent_behavior.ts
        cosmic_engine.ts
        cosmic_integration.ts
        cosmic_mode.ts
        rng.ts
        diagnostics.ts
        index.ts
        __tests__/
          gravitational.test.ts
          dynamics.test.ts
          stellar.test.ts
          ism.test.ts
          integration.test.ts
```

### 14.1 index.ts (Barrel Exports)

```ts
// =============================================================================
// index.ts - Barrel exports for Cosmic Mode
// =============================================================================

export * from './cosmic_constants';
export * from './cosmic_schema';
export * from './gravitational_architecture';
export * from './galactic_dynamics';
export * from './spiral_arm_dynamics';
export * from './stellar_formation';
export * from './interstellar_medium';
export * from './emergent_behavior';
export * from './cosmic_engine';
export * from './cosmic_integration';
export * from './cosmic_mode';
export * from './rng';
export * from './diagnostics';
```

---

## 15. Unit Test Templates

### 15.1 gravitational.test.ts

```ts
import {
  computeCircularVelocity,
  computeNFWEnclosedMass,
  computeHernquistPotential,
  computeMiyamotoNagaiPotential,
  computeNFWPotential,
} from '../gravitational_architecture';
import { COSMIC_CONSTANTS } from '../cosmic_constants';

const MW = COSMIC_CONSTANTS.MW;

describe('Gravitational Architecture', () => {
  test('Circular velocity at R_sun is near expected band', () => {
    const v = computeCircularVelocity(MW.R_SUN);
    expect(v).toBeGreaterThan(200);
    expect(v).toBeLessThan(260);
  });

  test('NFW enclosed mass at r_vir approaches M_vir', () => {
    const M = computeNFWEnclosedMass(
      MW.HALO_VIRIAL_RADIUS,
      MW.HALO_VIRIAL_MASS,
      MW.HALO_SCALE_RADIUS,
      MW.HALO_CONCENTRATION
    );
    const rel = Math.abs(M - MW.HALO_VIRIAL_MASS) / MW.HALO_VIRIAL_MASS;
    expect(rel).toBeLessThan(0.01);
  });

  test('Hernquist potential is negative and shallower with radius', () => {
    const p1 = computeHernquistPotential(1, 0, MW.BULGE_MASS, MW.BULGE_SCALE_RADIUS);
    const p2 = computeHernquistPotential(10, 0, MW.BULGE_MASS, MW.BULGE_SCALE_RADIUS);
    expect(p1).toBeLessThan(0);
    expect(p2).toBeGreaterThan(p1);
  });

  test('Miyamoto-Nagai converges to Kuzmin-like limit as b->0', () => {
    const p = computeMiyamotoNagaiPotential(5, 0, 1e10, 3.0, 1e-3);
    const pK = -COSMIC_CONSTANTS.G * 1e10 / Math.sqrt(25 + 9);
    const rel = Math.abs(p - pK) / Math.abs(pK);
    expect(rel).toBeLessThan(0.01);
  });

  test('NFW potential finite at center', () => {
    const p0 = computeNFWPotential(0, 0, MW.HALO_VIRIAL_MASS, MW.HALO_SCALE_RADIUS, MW.HALO_CONCENTRATION);
    expect(Number.isFinite(p0)).toBe(true);
    expect(p0).toBeLessThan(0);
  });
});
```

### 15.2 dynamics.test.ts

```ts
import { computeRotationState, computeEscapeVelocity } from '../galactic_dynamics';
import { COSMIC_CONSTANTS } from '../cosmic_constants';

const MW = COSMIC_CONSTANTS.MW;

describe('Galactic Dynamics', () => {
  test('Rotation curve is roughly flat between 5 and 15 kpc', () => {
    const v5 = computeRotationState(5).v_circ;
    const v10 = computeRotationState(10).v_circ;
    const v15 = computeRotationState(15).v_circ;
    expect(Math.abs(v10 - v5) / v10).toBeLessThan(0.15);
    expect(Math.abs(v15 - v10) / v10).toBeLessThan(0.15);
  });

  test('kappa/omega near sqrt(2) for near-flat curve', () => {
    const rot = computeRotationState(MW.R_SUN);
    const ratio = rot.kappa / rot.omega;
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThan(1.6);
  });

  test('Oort A in expected observational range', () => {
    const A = computeRotationState(MW.R_SUN).oort_A;
    expect(A).toBeGreaterThan(10);
    expect(A).toBeLessThan(20);
  });

  test('Escape speed exceeds circular speed', () => {
    const vEsc = computeEscapeVelocity(MW.R_SUN);
    const vCirc = computeRotationState(MW.R_SUN).v_circ;
    expect(vEsc).toBeGreaterThan(vCirc);
  });
});
```

### 15.3 stellar.test.ts

```ts
import { sampleIMF, computeMainSequenceLifetime, computeSFR } from '../stellar_formation';
import { Mulberry32RNG } from '../rng';
import { COSMIC_CONSTANTS } from '../cosmic_constants';

describe('Stellar Formation', () => {
  test('Kroupa IMF mean mass is in expected range', () => {
    const imf = sampleIMF(1e6, new Mulberry32RNG(12345));
    expect(imf.mean_mass).toBeGreaterThan(0.2);
    expect(imf.mean_mass).toBeLessThan(0.6);
  });

  test('Solar-mass lifetime near 10 Gyr', () => {
    const tau = computeMainSequenceLifetime(1.0);
    expect(tau).toBeGreaterThan(8000);
    expect(tau).toBeLessThan(12000);
  });

  test('Massive-star lifetime less than 10 Myr', () => {
    expect(computeMainSequenceLifetime(25.0)).toBeLessThan(10);
  });

  test('Integrated SFR order of magnitude matches MW', () => {
    const MW = COSMIC_CONSTANTS.MW;
    let total = 0;
    const dR = 0.5;
    for (let R = 0.5; R < 25; R += dR) {
      const s0 = MW.GAS_MASS_TOTAL / (2 * Math.PI * MW.GAS_SCALE_LENGTH * MW.GAS_SCALE_LENGTH);
      const sg = s0 * Math.exp(-R / MW.GAS_SCALE_LENGTH);
      total += computeSFR(sg, R) * 2 * Math.PI * R * dR;
    }
    expect(total).toBeGreaterThan(0.5);
    expect(total).toBeLessThan(5.0);
  });
});
```

### 15.4 ism.test.ts

```ts
import {
  computeCoolingRate,
  computeThermalEquilibrium,
  determineISMPhase,
} from '../interstellar_medium';

describe('Interstellar Medium', () => {
  test('n=0.5 cm^-3 gives warm neutral equilibrium', () => {
    const T = computeThermalEquilibrium(0.5, 1.0, 2e-16, 1.0);
    expect(T).toBeGreaterThan(3000);
    expect(T).toBeLessThan(10000);
  });

  test('n=30 cm^-3 gives cold neutral equilibrium', () => {
    const T = computeThermalEquilibrium(30, 1.0, 2e-16, 1.0);
    expect(T).toBeGreaterThan(20);
    expect(T).toBeLessThan(200);
  });

  test('Cooling generally rises from 1e4 to 1e5 K at n=1', () => {
    const c1 = computeCoolingRate(1e4, 1.0, 1.0);
    const c2 = computeCoolingRate(1e5, 1.0, 1.0);
    expect(c2).toBeGreaterThan(c1);
  });

  test('Phase classifier consistency', () => {
    expect(determineISMPhase(15, 500)).toBe('MOLECULAR');
    expect(determineISMPhase(6000, 0.3)).toBe('WARM_NEUTRAL');
    expect(determineISMPhase(1e6, 0.003)).toBe('HOT_IONIZED');
  });
});
```

### 15.5 integration.test.ts

```ts
import { createDefaultConfig } from '../cosmic_mode';
import { CosmicEngine } from '../cosmic_engine';

describe('Integration and Determinism', () => {
  test('Identical seed gives identical state trajectory', () => {
    const cfg = { ...createDefaultConfig(), total_duration: 5, seed: 999 };

    const e1 = new CosmicEngine(cfg);
    e1.initialize();
    e1.run(5);
    const s1 = e1.getState();

    const e2 = new CosmicEngine(cfg);
    e2.initialize();
    e2.run(5);
    const s2 = e2.getState();

    expect(s1.current_time).toBe(s2.current_time);
    expect(s1.step_count).toBe(s2.step_count);
    expect(s1.diagnostics.total_mass).toBe(s2.diagnostics.total_mass);
    expect(s1.bar.position_angle).toBe(s2.bar.position_angle);
  });

  test('Serialization round trip preserves engine state', () => {
    const cfg = { ...createDefaultConfig(), total_duration: 3, seed: 42 };
    const e1 = new CosmicEngine(cfg);
    e1.initialize();
    e1.run(3);

    const e2 = CosmicEngine.deserialize(e1.serialize());

    const s1 = e1.getState();
    const s2 = e2.getState();
    expect(s1.current_time).toBe(s2.current_time);
    expect(s1.diagnostics.total_mass).toBe(s2.diagnostics.total_mass);
  });
});
```

---

## 16. Physics Reference Appendix

| # | Module | Equation | Notes | Source |
|---|---|---|---|---|
| 1 | Gravity | Phi_b = -G M_b / (r + a_b) | Hernquist bulge potential | Hernquist (1990) |
| 2 | Gravity | Phi_d = -G M_d / sqrt(R^2 + (a + sqrt(z^2 + b^2))^2) | Miyamoto-Nagai disk | Miyamoto and Nagai (1975) |
| 3 | Gravity | Phi_h = -G M_vir ln(1 + r/r_s) / (r f(c)) | NFW halo potential | NFW (1996) |
| 4 | Gravity | f(c) = ln(1+c) - c/(1+c) | NFW concentration normalization | NFW (1996) |
| 5 | Gravity | rho_NFW = rho_s / [(r/r_s)(1+r/r_s)^2] | Halo density profile | NFW (1996) |
| 6 | Dynamics | v_c = sqrt(R abs(dPhi/dR)) | Circular speed | Binney and Tremaine |
| 7 | Dynamics | kappa^2 = 4 Omega^2 + 2 Omega R dOmega/dR | Epicyclic frequency | Binney and Tremaine |
| 8 | Dynamics | nu^2 = d2Phi/dz2 at z=0 | Vertical frequency | Binney and Tremaine |
| 9 | Dynamics | Q = kappa sigma_R / (pi G Sigma) | Toomre stability | Toomre (1964) |
| 10 | Spiral | Phi_sp = -A(R) cos(m[phi - Omega_p t] - f(R)) | Lin-Shu density wave | Lin and Shu (1964) |
| 11 | Spiral | phi(R) = phi_ref + (1/tan i) ln(R/R_ref) | Log spiral geometry | Vallee (2017) |
| 12 | SFR | Sigma_SFR = A Sigma_gas^N | Kennicutt-Schmidt relation | Kennicutt (1998) |
| 13 | SFR | rho_SFR = epsilon_ff rho_gas / tau_ff | Volumetric SFR | Krumholz and McKee |
| 14 | IMF | dN/dm proportional to m^-alpha | Piecewise Kroupa IMF | Kroupa (2001) |
| 15 | Stellar | tau_MS approx 1e4 (m/Msun)^-2.5 Myr | MS lifetime scaling | Hansen and Kawaler |
| 16 | ISM | P = n k_B T | Ideal gas closure | Standard |
| 17 | ISM | Gamma_PE approx 1e-25 n G0 | Photoelectric heating | Bakes and Tielens |
| 18 | ISM | f_H2 = 1 - 0.75 s / (1 + 0.25 s) | Krumholz molecular fraction | Krumholz et al. |
| 19 | Bar | Phi_bar proportional to cos(2[phi - Omega_bar t - phi_0]) | m=2 bar mode | Portail et al. |
| 20 | Warp | z_warp proportional to f(R)^2 sin(phi - phi_nodes) | Outer-disk warp | Levine et al. |

---

## End of Document

Ionirix Cosmic Mode - Complete Implementation  
Version 1.0.0  
Document ID: ION-COSMIC-IMPL-2026-001  
Classification: Sovereign / Internal
