/**
 * Ionirix Environment Mode — Scale Manager
 * Manages 7-level spatial resolution hierarchy from Planet to Village
 * © 2026 MK Publishing. All Rights Reserved.
 */

import {
  ScaleLevel,
  GeoCoordinate,
  GeoBoundingBox,
  GeoRegion,
  SpatialCell,
  TerrainType,
  LandUseType,
  ClimateState,
  PrecipitationType,
  SeededRandom,
} from '../types/environment.types';

// ─── Scale Resolution Config ────────────────────────────────────

export interface ScaleResolution {
  level: ScaleLevel;
  label: string;
  cellSizeKm2: number;
  timeStepHours: number;
  description: string;
}

export const SCALE_RESOLUTIONS: Record<ScaleLevel, ScaleResolution> = {
  [ScaleLevel.PLANET]: {
    level: ScaleLevel.PLANET,
    label: 'Planet',
    cellSizeKm2: 100_000,
    timeStepHours: 720,     // 30 days
    description: 'Full planetary overview — continental masses, ocean basins, global climate',
  },
  [ScaleLevel.CONTINENT]: {
    level: ScaleLevel.CONTINENT,
    label: 'Continent',
    cellSizeKm2: 50_000,
    timeStepHours: 168,     // 7 days
    description: 'Continental landmasses — biome distribution, tectonic plates, major rivers',
  },
  [ScaleLevel.COUNTRY]: {
    level: ScaleLevel.COUNTRY,
    label: 'Country',
    cellSizeKm2: 10_000,
    timeStepHours: 24,      // 1 day
    description: 'Sovereign nations — national infrastructure, demographics, governance',
  },
  [ScaleLevel.REGION]: {
    level: ScaleLevel.REGION,
    label: 'Region',
    cellSizeKm2: 1_000,
    timeStepHours: 6,
    description: 'States and provinces — regional economics, transport corridors, ecology',
  },
  [ScaleLevel.METRO]: {
    level: ScaleLevel.METRO,
    label: 'Metro',
    cellSizeKm2: 100,
    timeStepHours: 1,
    description: 'Metropolitan areas — urban sprawl, commuter networks, energy grids',
  },
  [ScaleLevel.CITY]: {
    level: ScaleLevel.CITY,
    label: 'City',
    cellSizeKm2: 10,
    timeStepHours: 0.5,
    description: 'Individual cities — neighborhoods, local infrastructure, microclimate',
  },
  [ScaleLevel.VILLAGE]: {
    level: ScaleLevel.VILLAGE,
    label: 'Village',
    cellSizeKm2: 1,
    timeStepHours: 0.25,
    description: 'Villages and neighborhoods — building-level detail, local ecosystems',
  },
};

// ─── Scale Manager ──────────────────────────────────────────────

export class ScaleManager {
  private currentScale: ScaleLevel = ScaleLevel.PLANET;
  private regions: Map<string, GeoRegion> = new Map();
  private cells: Map<string, SpatialCell[]> = new Map();
  private rng: SeededRandom;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
  }

  // ── Scale Navigation ───────────────────────────────────────────

  getCurrentScale(): ScaleLevel {
    return this.currentScale;
  }

  getResolution(): ScaleResolution {
    return SCALE_RESOLUTIONS[this.currentScale];
  }

  setScale(level: ScaleLevel): void {
    this.currentScale = level;
  }

  zoomIn(): ScaleLevel {
    if (this.currentScale < ScaleLevel.VILLAGE) {
      this.currentScale++;
    }
    return this.currentScale;
  }

  zoomOut(): ScaleLevel {
    if (this.currentScale > ScaleLevel.PLANET) {
      this.currentScale--;
    }
    return this.currentScale;
  }

  canZoomIn(): boolean {
    return this.currentScale < ScaleLevel.VILLAGE;
  }

  canZoomOut(): boolean {
    return this.currentScale > ScaleLevel.PLANET;
  }

  // ── Region Management ──────────────────────────────────────────

  addRegion(region: GeoRegion): void {
    this.regions.set(region.id, region);
  }

  getRegion(id: string): GeoRegion | undefined {
    return this.regions.get(id);
  }

  getRegionsByScale(scale: ScaleLevel): GeoRegion[] {
    const results: GeoRegion[] = [];
    for (const region of this.regions.values()) {
      if (region.scale === scale) results.push(region);
    }
    return results;
  }

  getChildRegions(parentId: string): GeoRegion[] {
    const parent = this.regions.get(parentId);
    if (!parent) return [];
    return parent.childIds
      .map(id => this.regions.get(id))
      .filter((r): r is GeoRegion => r !== undefined);
  }

  getParentRegion(childId: string): GeoRegion | undefined {
    const child = this.regions.get(childId);
    if (!child || !child.parentId) return undefined;
    return this.regions.get(child.parentId);
  }

  getAllRegions(): GeoRegion[] {
    return Array.from(this.regions.values());
  }

  // ── Spatial Cell Management ────────────────────────────────────

  generateCellsForRegion(regionId: string): SpatialCell[] {
    const region = this.regions.get(regionId);
    if (!region) return [];

    const resolution = SCALE_RESOLUTIONS[region.scale];
    const cellCount = Math.max(1, Math.ceil(region.areaKm2 / resolution.cellSizeKm2));
    const cells: SpatialCell[] = [];

    const latSpan = region.boundingBox.north - region.boundingBox.south;
    const lonSpan = region.boundingBox.east - region.boundingBox.west;

    const gridSide = Math.max(1, Math.ceil(Math.sqrt(cellCount)));

    for (let row = 0; row < gridSide; row++) {
      for (let col = 0; col < gridSide; col++) {
        if (cells.length >= cellCount) break;

        const lat = region.boundingBox.south + (row + 0.5) * (latSpan / gridSide);
        const lon = region.boundingBox.west + (col + 0.5) * (lonSpan / gridSide);

        const cell: SpatialCell = {
          id: `cell_${regionId}_${row}_${col}`,
          regionId,
          centroid: { lat, lon },
          areaKm2: resolution.cellSizeKm2,
          terrain: this.assignTerrain(lat, lon, region),
          landUse: LandUseType.WILDERNESS,
          elevation: this.estimateElevation(lat, lon),
          waterBodies: [],
          mineralDeposits: [],
          climate: this.defaultClimate(lat),
          population: 0,
          metadata: {},
        };

        cells.push(cell);
      }
    }

    this.cells.set(regionId, cells);
    return cells;
  }

  getCellsForRegion(regionId: string): SpatialCell[] {
    return this.cells.get(regionId) || [];
  }

  // ── Spatial Queries ────────────────────────────────────────────

  findRegionAt(coord: GeoCoordinate, scale?: ScaleLevel): GeoRegion | undefined {
    const targetScale = scale ?? this.currentScale;
    for (const region of this.regions.values()) {
      if (region.scale !== targetScale) continue;
      if (this.isInsideBBox(coord, region.boundingBox)) {
        return region;
      }
    }
    return undefined;
  }

  findRegionsInBBox(bbox: GeoBoundingBox, scale?: ScaleLevel): GeoRegion[] {
    const results: GeoRegion[] = [];
    for (const region of this.regions.values()) {
      if (scale !== undefined && region.scale !== scale) continue;
      if (this.bboxOverlaps(bbox, region.boundingBox)) {
        results.push(region);
      }
    }
    return results;
  }

  distanceKm(a: GeoCoordinate, b: GeoCoordinate): number {
    const R = 6371;
    const dLat = this.toRad(b.lat - a.lat);
    const dLon = this.toRad(b.lon - a.lon);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat +
      Math.cos(this.toRad(a.lat)) * Math.cos(this.toRad(b.lat)) * sinLon * sinLon;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  // ── Cross-Scale Propagation ────────────────────────────────────

  propagateUpward(regionId: string, key: string, value: number): void {
    const region = this.regions.get(regionId);
    if (!region || !region.parentId) return;

    const parent = this.regions.get(region.parentId);
    if (!parent) return;

    const siblings = this.getChildRegions(parent.id);
    const aggregated = siblings.reduce((sum, sib) => {
      const cells = this.cells.get(sib.id);
      if (!cells) return sum;
      return sum + cells.reduce((s, c) => s + ((c.metadata as any)?.[key] ?? 0), 0);
    }, 0);

    if (!parent.metadata) parent.metadata = {};
    (parent.metadata as any)[key] = aggregated;

    this.propagateUpward(parent.id, key, aggregated);
  }

  propagateDownward(regionId: string, key: string, value: number): void {
    const region = this.regions.get(regionId);
    if (!region) return;

    const children = this.getChildRegions(regionId);
    if (children.length === 0) return;

    const share = value / children.length;
    for (const child of children) {
      if (!child.metadata) child.metadata = {};
      (child.metadata as any)[key] = share;
      this.propagateDownward(child.id, key, share);
    }
  }

  // ── Serialization ──────────────────────────────────────────────

  serialize(): string {
    return JSON.stringify({
      currentScale: this.currentScale,
      regions: Array.from(this.regions.entries()),
      cells: Array.from(this.cells.entries()),
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.currentScale = parsed.currentScale;
    this.regions = new Map(parsed.regions);
    this.cells = new Map(parsed.cells);
    this.rng.setState(parsed.rngState);
  }

  // ── Private Helpers ────────────────────────────────────────────

  private assignTerrain(lat: number, lon: number, region: GeoRegion): TerrainType {
    const absLat = Math.abs(lat);
    if (absLat > 75) return TerrainType.ICE_SHEET;
    if (absLat > 65) return TerrainType.TUNDRA;

    const elev = this.estimateElevation(lat, lon);
    if (elev < -200) return TerrainType.OCEAN_DEEP;
    if (elev < 0) return TerrainType.OCEAN_SHALLOW;
    if (elev < 50) return TerrainType.COASTAL;
    if (elev > 3000) return TerrainType.MOUNTAIN;
    if (elev > 1500) return TerrainType.PLATEAU;
    if (elev > 600) return TerrainType.HILL;

    if (absLat < 30 && this.rng.next() < 0.3) return TerrainType.DESERT;
    if (this.rng.next() < 0.1) return TerrainType.WETLAND;

    return this.rng.next() < 0.3 ? TerrainType.VALLEY : TerrainType.PLAIN;
  }

  private estimateElevation(lat: number, lon: number): number {
    const x = Math.sin(lat * 0.1) * Math.cos(lon * 0.1);
    const y = Math.cos(lat * 0.07) * Math.sin(lon * 0.13);
    return (x + y) * 1500 + this.rng.nextFloat(-200, 200);
  }

  private defaultClimate(lat: number): ClimateState {
    const absLat = Math.abs(lat);
    return {
      temperature: 30 - absLat * 0.6 + this.rng.nextFloat(-3, 3),
      humidity: absLat < 30 ? 0.7 : absLat < 60 ? 0.5 : 0.3,
      pressure: 1013.25 + this.rng.nextFloat(-10, 10),
      windSpeed: this.rng.nextFloat(1, 15),
      windDirection: this.rng.nextFloat(0, 360),
      precipitation: absLat < 20 ? this.rng.nextFloat(0, 5) : this.rng.nextFloat(0, 2),
      precipType: PrecipitationType.NONE,
      cloudCover: this.rng.nextFloat(0, 1),
      solarIrradiance: (1 - absLat / 90) * 1000 + this.rng.nextFloat(-50, 50),
      co2ppm: 420,
      albedo: absLat > 70 ? 0.7 : 0.3,
    };
  }

  private isInsideBBox(coord: GeoCoordinate, bbox: GeoBoundingBox): boolean {
    return coord.lat >= bbox.south && coord.lat <= bbox.north &&
           coord.lon >= bbox.west && coord.lon <= bbox.east;
  }

  private bboxOverlaps(a: GeoBoundingBox, b: GeoBoundingBox): boolean {
    return a.west <= b.east && a.east >= b.west &&
           a.south <= b.north && a.north >= b.south;
  }

  private toRad(deg: number): number {
    return deg * Math.PI / 180;
  }
}
