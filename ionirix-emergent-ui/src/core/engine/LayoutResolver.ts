import type {
  GridDefinition,
  LayoutSchema,
  ResolvedGrid,
  ResolvedLayout,
  ResolvedZone,
  UserPreferences,
  ViewportContext,
  ZoneDefinition,
} from '@/types';

export class LayoutResolver {
  resolve(
    schema: LayoutSchema,
    viewport: ViewportContext,
    preferences: UserPreferences,
    activeBehaviors: string[],
  ): ResolvedLayout {
    const grid = this.resolveGrid(
      schema.surface.grid ?? { columns: '1fr', rows: '1fr', gap: '16px', areas: ['main'] },
      viewport,
    );
    const zones = Object.fromEntries(
      schema.surface.zones.map((zone) => {
        const resolved = this.resolveZone(zone, viewport, schema.surface.zones);
        const boostedZIndex = preferences.motionPreference === 'none' ? resolved.zIndex : resolved.zIndex + 1;
        return [zone.id, { ...resolved, zIndex: boostedZIndex }];
      }),
    );

    return {
      id: schema.surface.id,
      grid,
      zones,
      metadata: {
        surfaceType: schema.surface.type,
        activeBehaviors,
        transitions: schema.transitions ?? {
          duration: '300ms',
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          stagger: 50,
          yOffset: 14,
          scaleDelta: 0.02,
          blurCollapsed: 'blur(1px)',
        },
      },
    };
  }

  resolveZone(zone: ZoneDefinition, viewport: ViewportContext, siblingZones: ZoneDefinition[]): ResolvedZone {
    const collapseRules = this.evaluateCollapseRules(siblingZones, viewport.width);
    const collapseAction = collapseRules.get(zone.id);
    const visibility =
      collapseAction === 'hide'
        ? 'hidden'
        : collapseAction === 'merge'
          ? 'merged'
          : collapseAction === 'minimize'
            ? 'collapsed'
            : 'visible';

    return {
      id: zone.id,
      component: zone.component,
      gridArea: zone.area ?? zone.id,
      computedWidth: viewport.width,
      computedHeight: viewport.height,
      visibility,
      priority: zone.priority ?? 50,
      zIndex: zone.priority ?? 50,
    };
  }

  resolveGrid(grid: GridDefinition, viewport: ViewportContext): ResolvedGrid {
    return {
      columns: grid.columns,
      rows: grid.rows,
      gap: grid.gap,
      areas: grid.areas,
      totalWidth: viewport.width,
      totalHeight: viewport.height,
    };
  }

  evaluateCollapseRules(
    zones: ZoneDefinition[],
    viewportWidth: number,
  ): Map<string, 'hide' | 'minimize' | 'stack' | 'merge'> {
    const collapseMap = new Map<string, 'hide' | 'minimize' | 'stack' | 'merge'>();

    zones.forEach((zone) => {
      const threshold = zone.responsive?.threshold;
      const collapse = zone.responsive?.collapse;

      if (threshold !== undefined && collapse !== undefined && viewportWidth < threshold) {
        collapseMap.set(zone.id, collapse);
      }
    });

    return collapseMap;
  }
}