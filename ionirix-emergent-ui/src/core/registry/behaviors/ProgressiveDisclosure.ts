import type { Behavior, BehaviorContext, SurfaceUpdate } from '@/types';

export const ProgressiveDisclosure: Behavior = {
  id: 'progressive-disclosure',
  name: 'Progressive Disclosure',
  description: 'Reveals advanced UI elements as user demonstrates mastery',
  priority: 60,
  trigger: 'STATE_TRANSITION',
  evaluate(context: BehaviorContext): boolean {
    const uniqueActions = new Set(context.interactionHistory.map((item) => item.event));
    const depthThreshold = 3;
    return uniqueActions.size >= depthThreshold;
  },
  execute(zoneId: string, params: Record<string, unknown>): SurfaceUpdate {
    const revealSelector = (params.revealSelector as string) ?? '.advanced-options';
    const depthThreshold = (params.depthThreshold as number) ?? 3;

    return {
      zoneId,
      mutations: [
        { property: 'data-disclosure-level', value: depthThreshold },
        { property: 'data-reveal-selector', value: revealSelector },
        { property: 'data-disclosed', value: true },
      ],
      animate: true,
      duration: 400,
    };
  },
};