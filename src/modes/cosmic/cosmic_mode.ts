// =============================================================================
// cosmic_mode.ts
// Ionirix Cosmic Mode - Public API
// =============================================================================

import {
  createDefaultSimulationConfig,
  type CosmicSimulationConfig
} from "./cosmic_schema.ts";
import { validateConfig } from "./cosmic_schema.ts";
import { CosmicModeAdapter } from "./cosmic_integration.ts";

export const COSMIC_MODE_VERSION = "1.0.0";

export function createDefaultConfig(): CosmicSimulationConfig {
  return createDefaultSimulationConfig();
}

export function initializeCosmicMode(overrides?: Partial<CosmicSimulationConfig>): CosmicModeAdapter {
  const config = { ...createDefaultConfig(), ...overrides };
  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new Error(`Cosmic Mode config invalid: ${validation.errors.join("; ")}`);
  }

  const adapter = new CosmicModeAdapter(config);
  adapter.initialize();
  return adapter;
}

export { CosmicEngine } from "./cosmic_engine.ts";
export { CosmicModeAdapter, CosmicEventBus, type CosmicEvent, type CosmicEventType } from "./cosmic_integration.ts";
