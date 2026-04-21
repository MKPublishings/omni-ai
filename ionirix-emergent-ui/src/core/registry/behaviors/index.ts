import { BehaviorRegistry } from '../BehaviorRegistry';
import { AdaptiveReveal } from './AdaptiveReveal';
import { ContextualElevation } from './ContextualElevation';
import { ProgressiveDisclosure } from './ProgressiveDisclosure';
import { SpatialCollapse } from './SpatialCollapse';

export const registerDefaultBehaviors = (registry = BehaviorRegistry.getInstance()): BehaviorRegistry => {
  if (!registry.resolve(AdaptiveReveal.id)) {
    registry.register(AdaptiveReveal.id, AdaptiveReveal);
  }

  if (!registry.resolve(SpatialCollapse.id)) {
    registry.register(SpatialCollapse.id, SpatialCollapse);
  }

  if (!registry.resolve(ContextualElevation.id)) {
    registry.register(ContextualElevation.id, ContextualElevation);
  }

  if (!registry.resolve(ProgressiveDisclosure.id)) {
    registry.register(ProgressiveDisclosure.id, ProgressiveDisclosure);
  }

  return registry;
};

export * from './AdaptiveReveal';
export * from './ContextualElevation';
export * from './ProgressiveDisclosure';
export * from './SpatialCollapse';