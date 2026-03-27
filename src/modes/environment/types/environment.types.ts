/**
 * Ionirix Environment Mode — Core Type Definitions
 * Planetary-scale environmental simulation type system
 * © 2026 MK Publishing. All Rights Reserved.
 */

// ─── Scale Hierarchy ─────────────────────────────────────────────

export enum ScaleLevel {
  PLANET    = 0,  // L0 — full globe
  CONTINENT = 1,  // L1 — continental masses
  COUNTRY   = 2,  // L2 — sovereign nations
  REGION    = 3,  // L3 — states / provinces
  METRO     = 4,  // L4 — metropolitan areas
  CITY      = 5,  // L5 — individual cities
  VILLAGE   = 6,  // L6 — villages / neighborhoods
}

// ─── Geography Primitives ────────────────────────────────────────

export interface GeoCoordinate {
  lat: number;   // -90 to 90
  lon: number;   // -180 to 180
  alt?: number;  // meters above sea level
}

export interface GeoBoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoRegion {
  id: string;
  name: string;
  scale: ScaleLevel;
  centroid: GeoCoordinate;
  boundingBox: GeoBoundingBox;
  areaKm2: number;
  parentId: string | null;
  childIds: string[];
  metadata: Record<string, unknown>;
}

// ─── Spatial Grid ────────────────────────────────────────────────

export interface SpatialCell {
  id: string;
  regionId: string;
  centroid: GeoCoordinate;
  areaKm2: number;
  terrain: TerrainType;
  landUse: LandUseType;
  elevation: number;       // meters
  waterBodies: WaterBody[];
  mineralDeposits: MineralDeposit[];
  climate: ClimateState;
  population: number;
  metadata: Record<string, unknown>;
}

export enum TerrainType {
  OCEAN_DEEP      = 'ocean_deep',
  OCEAN_SHALLOW   = 'ocean_shallow',
  COASTAL         = 'coastal',
  PLAIN           = 'plain',
  HILL            = 'hill',
  MOUNTAIN        = 'mountain',
  PLATEAU         = 'plateau',
  VALLEY          = 'valley',
  DESERT          = 'desert',
  TUNDRA          = 'tundra',
  WETLAND         = 'wetland',
  VOLCANIC        = 'volcanic',
  ICE_SHEET       = 'ice_sheet',
  ISLAND          = 'island',
  CANYON           = 'canyon',
  DELTA           = 'delta',
}

export enum LandUseType {
  WILDERNESS      = 'wilderness',
  AGRICULTURE     = 'agriculture',
  URBAN           = 'urban',
  SUBURBAN        = 'suburban',
  INDUSTRIAL      = 'industrial',
  COMMERCIAL      = 'commercial',
  RESIDENTIAL     = 'residential',
  MILITARY        = 'military',
  PARK            = 'park',
  PROTECTED       = 'protected',
  MINING          = 'mining',
  FORESTRY        = 'forestry',
  AQUACULTURE     = 'aquaculture',
  MIXED_USE       = 'mixed_use',
  TRANSPORT_CORRIDOR = 'transport_corridor',
  ENERGY_ZONE     = 'energy_zone',
}

export enum WaterBodyType {
  RIVER           = 'river',
  LAKE            = 'lake',
  RESERVOIR       = 'reservoir',
  WETLAND         = 'wetland',
  GLACIER         = 'glacier',
  OCEAN           = 'ocean',
  SEA             = 'sea',
  AQUIFER         = 'aquifer',
  ESTUARY         = 'estuary',
  CANAL           = 'canal',
}

export interface WaterBody {
  id: string;
  name: string;
  type: WaterBodyType;
  volumeKm3: number;
  flowRateM3s: number;
  qualityIndex: number;       // 0–1
  temperature: number;        // °C
  salinity: number;           // PSU
}

export interface MineralDeposit {
  id: string;
  type: string;
  estimatedTonnes: number;
  extractionRate: number;     // tonnes/year
  depletionFraction: number;  // 0–1
  depth: number;              // meters
}

// ─── Climate State ───────────────────────────────────────────────

export interface ClimateState {
  temperature: number;        // °C
  humidity: number;           // 0–1
  pressure: number;           // hPa
  windSpeed: number;          // m/s
  windDirection: number;      // degrees
  precipitation: number;      // mm/hr
  precipType: PrecipitationType;
  cloudCover: number;         // 0–1
  solarIrradiance: number;   // W/m²
  co2ppm: number;
  albedo: number;             // 0–1
}

export enum PrecipitationType {
  NONE        = 'none',
  RAIN        = 'rain',
  DRIZZLE     = 'drizzle',
  SNOW        = 'snow',
  SLEET       = 'sleet',
  HAIL        = 'hail',
  FREEZING_RAIN = 'freezing_rain',
  FOG         = 'fog',
}

export interface AtmosphericLayer {
  name: string;
  altitudeMinKm: number;
  altitudeMaxKm: number;
  temperature: number;
  pressure: number;
  density: number;
  composition: Record<string, number>;
}

export interface WindPattern {
  id: string;
  name: string;
  type: 'trade' | 'westerly' | 'polar' | 'monsoon' | 'jet_stream' | 'local';
  direction: number;
  speedMs: number;
  seasonality: number[];      // month weights 0–1
  boundingBox: GeoBoundingBox;
}

// ─── Simulation State ────────────────────────────────────────────

export enum SimulationStatus {
  IDLE        = 'idle',
  RUNNING     = 'running',
  PAUSED      = 'paused',
  STEPPING    = 'stepping',
  ERROR       = 'error',
  COMPLETED   = 'completed',
}

export interface SimulationState {
  status: SimulationStatus;
  currentTick: number;
  elapsedSimHours: number;
  wallClockStartMs: number;
  activeScale: ScaleLevel;
  focusRegionId: string | null;
  systemStates: Map<string, unknown>;
  eventLog: SimulationLog[];
  seed: number;
}

export interface SimulationConfig {
  seed: number;
  startYear: number;
  timeAcceleration: number;       // sim hours per real second
  enabledSystems: string[];
  crossScalePropagation: boolean;
  snapshotIntervalTicks: number;
  maxSnapshots: number;
  logVerbosity: 'minimal' | 'normal' | 'verbose' | 'debug';
  activeScale: ScaleLevel;
  focusRegionId: string | null;
}

export interface SimulationStep {
  tick: number;
  deltaHours: number;
  systemUpdates: Map<string, unknown>;
  events: SimulationEvent[];
  metrics: SimulationMetrics;
}

export interface SimulationEvent {
  id: string;
  tick: number;
  system: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'catastrophic';
  regionId: string;
  description: string;
  data: Record<string, unknown>;
}

export interface SimulationMetrics {
  tick: number;
  timestamp: number;
  cpuTimeMs: number;
  systemMetrics: Record<string, Record<string, number>>;
}

export interface SimulationLog {
  tick: number;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  system: string;
  message: string;
  data?: unknown;
}

// ─── Snapshots ───────────────────────────────────────────────────

export interface EnvironmentSnapshot {
  id: string;
  tick: number;
  timestamp: number;
  label: string;
  state: string;  // serialized JSON
  checksum: string;
}

// ─── System Health ───────────────────────────────────────────────

export interface SystemHealth {
  systemId: string;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  lastUpdateTick: number;
  avgStepTimeMs: number;
  errorCount: number;
  warningCount: number;
  details: Record<string, unknown>;
}

// ─── PRNG ────────────────────────────────────────────────────────

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max) */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Gaussian via Box-Muller */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * stdDev + mean;
  }

  /** Pick a random element from an array */
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /** Shuffle array in place (Fisher-Yates) */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Get current state for serialization */
  getState(): number {
    return this.state;
  }

  /** Restore state for deserialization */
  setState(state: number): void {
    this.state = state;
  }
}
