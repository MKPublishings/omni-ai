import type { OnboardingContext } from '@/types';

export const onboardingGuards = {
  hasProfile: ({ context }: { context: OnboardingContext }) =>
    context.userProfile.name.length > 0 &&
    context.userProfile.role.length > 0 &&
    context.userProfile.experience !== null,
  hasCapabilities: ({ context }: { context: OnboardingContext }) => context.selectedCapabilities.length >= 1,
  isCalibrated: ({ context }: { context: OnboardingContext }) =>
    context.spatialPreferences.zoneCount > 0 && context.spatialPreferences.layoutMode !== null,
  canGoBack: ({ context }: { context: OnboardingContext }) => context.currentStep > 0,
};