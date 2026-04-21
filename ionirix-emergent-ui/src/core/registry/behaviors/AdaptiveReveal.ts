import type { Behavior, BehaviorContext, SurfaceUpdate } from '@/types';

export const AdaptiveReveal: Behavior = {
  id: 'adaptive-reveal',
  name: 'Adaptive Reveal',
  description: 'Reveals content progressively based on user engagement depth',
  priority: 80,
  trigger: 'INTERACTION',
  evaluate(context: BehaviorContext): boolean {
    const focusedZone = context.focusedZone;

    if (!focusedZone) {
      return false;
    }

    const zoneInteractions = context.interactionHistory.filter((entry) => entry.event.includes(focusedZone));
    return zoneInteractions.length >= 3;
  },
  execute(zoneId: string, params: Record<string, unknown>): SurfaceUpdate {
    const delay = (params.delay as number) ?? 300;
    const direction = (params.direction as string) ?? 'down';

    return {
      zoneId,
      mutations: [
        { property: 'data-reveal-state', value: 'revealed' },
        { property: 'data-reveal-direction', value: direction },
      ],
      animate: true,
      duration: delay,
    };
  },
  cleanup(): void {},
};