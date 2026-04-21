import type { LayoutSchema, StepSchema } from './layout.types';

export interface OnboardingLayoutSchema extends LayoutSchema {
  steps: StepSchema[];
}