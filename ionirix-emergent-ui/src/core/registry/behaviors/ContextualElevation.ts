import type { Behavior, BehaviorContext, SurfaceUpdate } from '@/types';

export const ContextualElevation: Behavior = {
  id: 'contextual-elevation',
  name: 'Contextual Elevation',
  description: 'Elevates the focused zone with z-index, scale, and glow',
  priority: 70,
  trigger: 'INTERACTION',
  evaluate(context: BehaviorContext): boolean {
    return context.focusedZone !== null;
  },
  execute(zoneId: string, params: Record<string, unknown>): SurfaceUpdate {
    const zIndexDelta = (params.zIndexDelta as number) ?? 10;
    const scaleFactor = (params.scaleFactor as number) ?? 1.02;
    const glowColor = (params.glowColor as string) ?? '#0A84FF';

    return {
      zoneId,
      mutations: [
        { property: 'z-index-delta', value: zIndexDelta },
        { property: 'scale', value: scaleFactor },
        { property: 'glow-color', value: glowColor },
        { property: 'data-elevated', value: true },
      ],
      animate: true,
      duration: 200,
    };
  },
  cleanup(): void {},
};