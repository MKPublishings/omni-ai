import { MultiverseEngine } from "./multiverse_engine";
import type { Seed64 } from "./seed_cascade";

export const MULTIVERSE_MODE_VERSION = "1.0.0";

export interface MultiverseBootstrap {
  engine: MultiverseEngine;
  initializedAt: number;
}

export function initializeMultiverseMode(masterSeed: Seed64 = 0x7a3f9c2e1b8d4f06n): MultiverseBootstrap {
  const engine = new MultiverseEngine(masterSeed, {
    cacheSize: 500_000,
    queryTimeout: 60_000,
    maxResultsHardCap: 100_000
  });

  return {
    engine,
    initializedAt: Date.now()
  };
}
