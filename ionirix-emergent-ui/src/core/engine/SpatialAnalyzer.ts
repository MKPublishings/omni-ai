import type { CollisionReport, ResolvedLayout, SpatialPreferences, SpatialWeightMap, ZoneDefinition } from '@/types';

export interface SpatialFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialRelation {
  zoneA: string;
  zoneB: string;
  distance: number;
  overlap: boolean;
  overlapArea: number;
  relativePosition: 'above' | 'below' | 'left' | 'right' | 'overlapping';
}

export interface VisualWeightReport {
  zoneId: string;
  weight: number;
  contentDensity: number;
  interactionFrequency: number;
  spatialImportance: number;
}

export interface SpatialSnapshot {
  timestamp: number;
  frames: Record<string, SpatialFrame>;
  relations: SpatialRelation[];
  weights: VisualWeightReport[];
  collisions: CollisionReport[];
  balance: { horizontal: number; vertical: number };
  recommendation: SpatialPreferences;
}

export class SpatialAnalyzer {
  capture(layout: ResolvedLayout): SpatialSnapshot {
    const zoneEntries = Object.values(layout.zones);
    const frames = this.estimateFrames(layout);
    const relations = zoneEntries.flatMap((zoneA, index) =>
      zoneEntries.slice(index + 1).map((zoneB) => {
        const frameA = frames[zoneA.id] ?? this.createFallbackFrame(zoneA, layout.grid.totalWidth, layout.grid.totalHeight);
        const frameB = frames[zoneB.id] ?? this.createFallbackFrame(zoneB, layout.grid.totalWidth, layout.grid.totalHeight);

        return {
          zoneA: zoneA.id,
          zoneB: zoneB.id,
          distance: this.measureDistance(frameA, frameB),
          overlap: this.detectFrameOverlap(frameA, frameB),
          overlapArea: this.calculateOverlapArea(frameA, frameB),
          relativePosition: this.getRelativePosition(frameA, frameB),
        } as SpatialRelation;
      }),
    );

    const weights = zoneEntries.map((zone) => ({
      zoneId: zone.id,
      weight: Math.min(1, zone.priority / 100),
      contentDensity: Math.min(1, zone.computedWidth / 1440),
      interactionFrequency: 0.5,
      spatialImportance: Math.min(1, zone.zIndex / 100),
    }));

    const collisions = relations
      .filter((relation) => relation.overlap)
      .map((relation) => ({
        zoneA: relation.zoneA,
        zoneB: relation.zoneB,
        overlapArea: relation.overlapArea,
      }));

    const balance = this.assessBalance(frames, layout.grid.totalWidth, layout.grid.totalHeight);
    const recommendation = this.recommendCalibration(zoneEntries.length, balance, layout.grid.totalWidth);

    return {
      timestamp: Date.now(),
      frames,
      relations,
      weights,
      collisions,
      balance,
      recommendation,
    };
  }

  calculateSpatialWeights(zones: ZoneDefinition[]): SpatialWeightMap {
    return Object.fromEntries(
      zones.map((zone) => [zone.id, { weight: (zone.priority ?? 50) / 100, priority: zone.priority ?? 50 }]),
    );
  }

  detectCollisions(layout: ResolvedLayout): CollisionReport[] {
    return this.capture(layout).collisions;
  }

  estimateFrames(layout: ResolvedLayout): Record<string, SpatialFrame> {
    const areas = layout.grid.areas.map((row) => row.trim().split(/\s+/));
    const rows = Math.max(1, areas.length);
    const cols = Math.max(1, Math.max(...areas.map((row) => row.length)));
    const cellWidth = layout.grid.totalWidth / cols;
    const cellHeight = layout.grid.totalHeight / rows;
    const frames: Record<string, SpatialFrame> = {};

    Object.values(layout.zones).forEach((zone) => {
      let foundX = 0;
      let foundY = 0;

      areas.forEach((row, rowIndex) => {
        row.forEach((area, colIndex) => {
          if (area === zone.gridArea) {
            foundX = colIndex;
            foundY = rowIndex;
          }
        });
      });

      frames[zone.id] = {
        x: foundX * cellWidth,
        y: foundY * cellHeight,
        width: Math.max(cellWidth, zone.computedWidth / cols),
        height: Math.max(cellHeight, zone.computedHeight / rows),
      };
    });

    return frames;
  }

  private assessBalance(frames: Record<string, SpatialFrame>, totalWidth: number, totalHeight: number) {
    const frameList = Object.values(frames);
    const centerX = totalWidth / 2;
    const centerY = totalHeight / 2;
    const horizontalWeight = frameList.reduce((sum, frame) => sum + (frame.x + frame.width / 2 - centerX), 0);
    const verticalWeight = frameList.reduce((sum, frame) => sum + (frame.y + frame.height / 2 - centerY), 0);

    return {
      horizontal: Number((horizontalWeight / Math.max(1, totalWidth)).toFixed(3)),
      vertical: Number((verticalWeight / Math.max(1, totalHeight)).toFixed(3)),
    };
  }

  private recommendCalibration(
    zoneCount: number,
    balance: { horizontal: number; vertical: number },
    viewportWidth: number,
  ): SpatialPreferences {
    const layoutMode = viewportWidth < 900 ? 'stack' : Math.abs(balance.horizontal) > 0.18 ? 'float' : 'grid';
    const sidebarPosition = balance.horizontal > 0.08 ? 'left' : balance.horizontal < -0.08 ? 'right' : 'hidden';

    return {
      layoutMode,
      sidebarPosition,
      zoneCount,
    };
  }

  private measureDistance(frameA: SpatialFrame, frameB: SpatialFrame): number {
    const centerAX = frameA.x + frameA.width / 2;
    const centerAY = frameA.y + frameA.height / 2;
    const centerBX = frameB.x + frameB.width / 2;
    const centerBY = frameB.y + frameB.height / 2;
    return Math.hypot(centerAX - centerBX, centerAY - centerBY);
  }

  private detectFrameOverlap(frameA: SpatialFrame, frameB: SpatialFrame): boolean {
    return !(
      frameA.x + frameA.width <= frameB.x ||
      frameB.x + frameB.width <= frameA.x ||
      frameA.y + frameA.height <= frameB.y ||
      frameB.y + frameB.height <= frameA.y
    );
  }

  private calculateOverlapArea(frameA: SpatialFrame, frameB: SpatialFrame): number {
    if (!this.detectFrameOverlap(frameA, frameB)) {
      return 0;
    }

    const width = Math.min(frameA.x + frameA.width, frameB.x + frameB.width) - Math.max(frameA.x, frameB.x);
    const height = Math.min(frameA.y + frameA.height, frameB.y + frameB.height) - Math.max(frameA.y, frameB.y);
    return Math.max(0, width) * Math.max(0, height);
  }

  private getRelativePosition(frameA: SpatialFrame, frameB: SpatialFrame): SpatialRelation['relativePosition'] {
    if (this.detectFrameOverlap(frameA, frameB)) {
      return 'overlapping';
    }

    if (frameA.y + frameA.height <= frameB.y) {
      return 'above';
    }

    if (frameB.y + frameB.height <= frameA.y) {
      return 'below';
    }

    return frameA.x <= frameB.x ? 'left' : 'right';
  }

  private createFallbackFrame(zone: ResolvedLayout['zones'][string], totalWidth: number, totalHeight: number): SpatialFrame {
    return {
      x: 0,
      y: 0,
      width: Math.min(zone.computedWidth, totalWidth),
      height: Math.min(zone.computedHeight, totalHeight),
    };
  }
}