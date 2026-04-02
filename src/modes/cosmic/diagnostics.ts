// =============================================================================
// diagnostics.ts
// Ionirix Cosmic Mode - Runtime diagnostics helpers
// =============================================================================

import { COSMIC_CONSTANTS } from "./cosmic_constants.ts";
import type { CosmicSimulationState } from "./cosmic_schema.ts";
import { computeCircularVelocity } from "./gravitational_architecture.ts";

const MW = COSMIC_CONSTANTS.MW;

export function computeVirialRatio(state: CosmicSimulationState): number {
  const v = computeCircularVelocity(MW.R_SUN) * COSMIC_CONSTANTS.KM_S_TO_KPC_MYR;
  const kinetic = 0.5 * state.diagnostics.total_stellar_mass * v * v;
  const potential =
    (COSMIC_CONSTANTS.G * state.diagnostics.total_mass * state.diagnostics.total_mass) /
    (2 * MW.R_SUN);
  return potential > 0 ? (2 * kinetic) / potential : 1;
}

export function computeTotalMass(state: CosmicSimulationState): number {
  return (
    state.diagnostics.total_stellar_mass
    + state.diagnostics.total_gas_mass
    + state.diagnostics.total_dark_matter_mass_enclosed
  );
}

export function generateDiagnosticReport(state: CosmicSimulationState): string {
  const d = state.diagnostics;
  return [
    "=== COSMIC MODE DIAGNOSTIC REPORT ===",
    `time=${state.current_time.toFixed(2)} Myr step=${state.step_count}`,
    `M_total=${d.total_mass.toExponential(4)} M_sun`,
    `M_star=${d.total_stellar_mass.toExponential(4)} M_sun`,
    `M_gas=${d.total_gas_mass.toExponential(4)} M_sun`,
    `M_dm=${d.total_dark_matter_mass_enclosed.toExponential(4)} M_sun`,
    `virial=${d.virial_ratio.toFixed(4)}`,
    `events: formation=${state.formation_events.length} death=${state.death_events.length}`,
    "=== END REPORT ==="
  ].join("\n");
}
