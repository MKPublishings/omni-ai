import { AdaptiveOctree } from "./octree";
import { deriveSeed, SplitMix64, type Seed64 } from "./seed_cascade";
import {
  createDefaultMultiverseConfig,
  type CosmicEntity,
  type LodLevel,
  type MultiverseQuery,
  type MultiverseResult,
  type UniverseConfig
} from "./multiverse_schema";

export interface MultiverseEngineOptions {
  cacheSize: number;
  queryTimeout: number;
  maxResultsHardCap: number;
}

const DEFAULT_OPTIONS: MultiverseEngineOptions = {
  cacheSize: 100_000,
  queryTimeout: 30_000,
  maxResultsHardCap: 100_000
};

const TYPE_BY_LOD: CosmicEntity["entityType"][] = [
  "cosmic_web_cell",
  "cosmic_web_cell",
  "supercluster",
  "galaxy_cluster",
  "galaxy",
  "star",
  "planet",
  "moon"
];

export class MultiverseEngine {
  private config: UniverseConfig;
  private options: MultiverseEngineOptions;
  private octree: AdaptiveOctree<CosmicEntity>;
  private cache: Map<string, CosmicEntity>;
  private generationCount = 0;

  constructor(masterSeed: Seed64, options?: Partial<MultiverseEngineOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.config = createDefaultMultiverseConfig(masterSeed);
    this.octree = new AdaptiveOctree<CosmicEntity>(this.config.bounds, 40, 64);
    this.cache = new Map();
  }

  getConfig(): Readonly<UniverseConfig> {
    return Object.freeze({ ...this.config });
  }

  async query(q: MultiverseQuery): Promise<MultiverseResult> {
    const started = performance.now();
    const maxResults = Math.min(Math.max(1, q.maxResults || 1000), this.options.maxResultsHardCap);
    const entities = this.generateForQuery(q, maxResults);

    for (const entity of entities) {
      this.cache.set(entity.id, entity);
      this.octree.insert(entity);
    }

    if (this.cache.size > this.options.cacheSize) {
      const trimCount = this.cache.size - this.options.cacheSize;
      const keys = Array.from(this.cache.keys()).slice(0, trimCount);
      for (const key of keys) this.cache.delete(key);
    }

    return {
      query: q,
      executionTimeMs: performance.now() - started,
      totalMatches: entities.length,
      returnedCount: entities.length,
      entities,
      metadata: {
        seedPath: this.buildSeedPath(q),
        lodLevel: q.lodLevel,
        generatedCount: this.generationCount,
        cachedCount: this.cache.size,
        octreeNodesTraversed: 0,
        cosmologyVersion: "Planck2018"
      }
    };
  }

  private generateForQuery(q: MultiverseQuery, maxResults: number): CosmicEntity[] {
    const center = this.resolveCenter(q);
    const radius = q.coordinates.radius || this.deriveDefaultRadius(q.lodLevel);
    const lod = q.lodLevel;

    const seedRoot = deriveSeed(this.config.masterSeed, BigInt(Math.round((center[0] + 7130) * 1000)));
    const rng = new SplitMix64(seedRoot);

    const results: CosmicEntity[] = [];
    const count = Math.min(maxResults, this.estimateEntityCount(lod, radius));

    for (let i = 0; i < count; i++) {
      const childSeed = deriveSeed(seedRoot, BigInt(i));
      const childRng = new SplitMix64(childSeed);

      const distance = radius * Math.cbrt(childRng.nextFloat());
      const theta = Math.acos(2 * childRng.nextFloat() - 1);
      const phi = 2 * Math.PI * childRng.nextFloat();

      const pos: [number, number, number] = [
        center[0] + distance * Math.sin(theta) * Math.cos(phi),
        center[1] + distance * Math.sin(theta) * Math.sin(phi),
        center[2] + distance * Math.cos(theta)
      ];

      const redshift = Math.max(0, Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2) / 4260);
      const id = this.entityIdFor(lod, i);

      results.push({
        id,
        seed: childSeed,
        entityType: TYPE_BY_LOD[lod],
        position: pos,
        redshift,
        parentId: null,
        lodLevel: lod,
        properties: this.buildProperties(lod, rng, childRng)
      });
      this.generationCount++;
    }

    return results;
  }

  private resolveCenter(q: MultiverseQuery): [number, number, number] {
    const values = q.coordinates.values || [];
    return [
      Number(values[0] || 0),
      Number(values[1] || 0),
      Number(values[2] || 0)
    ];
  }

  private deriveDefaultRadius(lod: LodLevel): number {
    if (lod <= 1) return 2500;
    if (lod === 2) return 450;
    if (lod === 3) return 60;
    if (lod === 4) return 8;
    if (lod === 5) return 0.2;
    if (lod === 6) return 0.02;
    return 0.005;
  }

  private estimateEntityCount(lod: LodLevel, radius: number): number {
    const volumeScale = Math.max(1, Math.floor((4 * Math.PI * radius ** 3) / 3));
    const base = [1, 8, 48, 120, 240, 320, 220, 180][lod];
    return Math.max(1, Math.min(100_000, Math.floor((base * Math.log10(volumeScale + 10)) / 2)));
  }

  private buildProperties(lod: LodLevel, rng: SplitMix64, childRng: SplitMix64): Record<string, number | string | boolean> {
    switch (lod) {
      case 1:
        return {
          webType: ["void", "wall", "filament", "knot"][childRng.nextInt(0, 3)],
          densityContrast: Number(childRng.nextGaussian(0, 0.811).toFixed(4))
        };
      case 2:
        return {
          totalMass: Number(childRng.nextRange(1e15, 1e17).toFixed(2)),
          morphology: ["filamentary", "planar", "compact"][childRng.nextInt(0, 2)]
        };
      case 3:
        return {
          virialMass: Number(childRng.nextRange(1e13, 3e15).toFixed(2)),
          galaxyCount: childRng.nextInt(10, 1800)
        };
      case 4:
        return {
          galaxyType: ["E", "S0", "Sa", "Sb", "Sc", "Irr", "dSph"][childRng.nextInt(0, 6)],
          stellarMass: Number(childRng.nextRange(1e7, 2e12).toFixed(2))
        };
      case 5:
        return {
          spectralType: ["O", "B", "A", "F", "G", "K", "M"][childRng.nextInt(0, 6)],
          mass: Number(childRng.nextRange(0.08, 80).toFixed(4))
        };
      case 6:
        return {
          planetType: ["terrestrial", "super_earth", "sub_neptune", "ice_giant", "gas_giant"][childRng.nextInt(0, 4)],
          inHabitableZone: childRng.nextFloat() < 0.18
        };
      case 7:
        return {
          composition: ["rocky", "icy", "mixed"][childRng.nextInt(0, 2)],
          isTidallyLocked: childRng.nextFloat() < 0.6
        };
      default:
        return {
          universeAgeGyr: this.config.cosmology.ageGyr,
          coveragePercent: 99
        };
    }
  }

  private entityIdFor(lod: LodLevel, index: number): string {
    const prefix = ["U", "CELL", "SC", "CL", "GAL", "STAR", "PL", "MOON"][lod];
    return `${prefix}-${index}`;
  }

  private buildSeedPath(q: MultiverseQuery): string {
    return `master -> LOD${q.lodLevel} @ [${q.coordinates.values.join(",")}]`;
  }
}
