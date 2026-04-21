import type { Behavior, BehaviorContext, SurfaceUpdate } from '@/types';

export const SpatialCollapse: Behavior = {
  id: 'spatial-collapse',
  name: 'Spatial Collapse',
  description: 'Collapses low-priority zones based on viewport and spatial context',
  priority: 90,
  trigger: 'VIEWPORT_RESIZE',
  evaluate(context: BehaviorContext): boolean {
    const zoneCount = context.activeZones.length;
    const minWidthPerZone = 280;
    return context.viewport.width < zoneCount * minWidthPerZone;
  },
  execute(zoneId: string, params: Record<string, unknown>): SurfaceUpdate {
    const animation = (params.animation as string) ?? 'fade-out';

    return {
      zoneId,
      mutations: [
        { property: 'visibility', value: 'collapsed' },
        { property: 'data-collapse-animation', value: animation },
      ],
      animate: true,
      duration: 300,
    };
  },
};