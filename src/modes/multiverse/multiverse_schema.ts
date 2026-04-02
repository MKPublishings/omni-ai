export type Seed64 = bigint;

export type MultiverseQueryType = "point" | "sphere" | "cone" | "box" | "path";

export type LodLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface CosmologyParams {
  H0: number;
  omegaMatter: number;
  omegaLambda: number;
  omegaBaryon: number;
  omegaCDM: number;
  sigma8: number;
  ns: number;
  tau: number;
  w0: number;
  T_CMB: number;
  ageGyr: number;
  comovingRadiusMpc: number;
  comovingRadiusGly: number;
}

export interface UniverseMetadata {
  created: string;
  engine: "ionirix-multiverse";
  engineVersion: string;
  coverage: "98-99%";
  deterministic: true;
  classification: "sovereign";
  buildDate: string;
}

export interface UniverseConfig {
  masterSeed: Seed64;
  version: string;
  cosmology: CosmologyParams;
  bounds: BoundingBox;
  metadata: UniverseMetadata;
}

export interface CoordinateSpec {
  system: "cartesian_mpc" | "equatorial" | "galactic" | "supergalactic";
  values: number[];
  radius?: number;
  halfAngle?: number;
}

export interface MultiverseQuery {
  type: MultiverseQueryType;
  coordinates: CoordinateSpec;
  lodLevel: LodLevel;
  maxResults?: number;
  includeParentChain?: boolean;
}

export interface CosmicEntity {
  id: string;
  seed: Seed64;
  entityType: "cosmic_web_cell" | "supercluster" | "galaxy_cluster" | "galaxy" | "star" | "planet" | "moon";
  position: [number, number, number];
  redshift: number;
  parentId: string | null;
  lodLevel: LodLevel;
  properties: Record<string, number | string | boolean>;
}

export interface MultiverseResult {
  query: MultiverseQuery;
  executionTimeMs: number;
  totalMatches: number;
  returnedCount: number;
  entities: CosmicEntity[];
  metadata: {
    seedPath: string;
    lodLevel: number;
    generatedCount: number;
    cachedCount: number;
    octreeNodesTraversed: number;
    cosmologyVersion: string;
  };
}

export const DEFAULT_COSMOLOGY: CosmologyParams = {
  H0: 67.4,
  omegaMatter: 0.315,
  omegaLambda: 0.685,
  omegaBaryon: 0.049,
  omegaCDM: 0.266,
  sigma8: 0.811,
  ns: 0.965,
  tau: 0.054,
  w0: -1.03,
  T_CMB: 2.7255,
  ageGyr: 13.787,
  comovingRadiusMpc: 14260,
  comovingRadiusGly: 46.5
};

export function createDefaultMultiverseConfig(masterSeed: Seed64): UniverseConfig {
  return {
    masterSeed,
    version: "1.0.0",
    cosmology: { ...DEFAULT_COSMOLOGY },
    bounds: {
      min: [-7130, -7130, -7130],
      max: [7130, 7130, 7130]
    },
    metadata: {
      created: new Date().toISOString(),
      engine: "ionirix-multiverse",
      engineVersion: "1.0.0",
      coverage: "98-99%",
      deterministic: true,
      classification: "sovereign",
      buildDate: "2026.04.02"
    }
  };
}
