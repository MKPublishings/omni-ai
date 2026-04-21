import { assign } from 'xstate';
import type { OnboardingContext, OnboardingEvent } from '@/types';

const persistContext = (context: OnboardingContext): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem('ionirix:onboarding', JSON.stringify(context));
};

export const onboardingActions = {
  incrementStep: assign({
    currentStep: ({ context }: { context: OnboardingContext }) => context.currentStep + 1,
  }),
  decrementStep: assign({
    currentStep: ({ context }: { context: OnboardingContext }) => Math.max(0, context.currentStep - 1),
  }),
  updateProfile: assign({
    userProfile: ({ context, event }: { context: OnboardingContext; event: OnboardingEvent }) => {
      if (event.type !== 'UPDATE_PROFILE') {
        return context.userProfile;
      }

      return { ...context.userProfile, ...event.data };
    },
  }),
  addCapability: assign({
    selectedCapabilities: ({ context, event }: { context: OnboardingContext; event: OnboardingEvent }) => {
      if (event.type !== 'SELECT_CAPABILITY') {
        return context.selectedCapabilities;
      }

      if (context.selectedCapabilities.includes(event.capability)) {
        return context.selectedCapabilities;
      }

      return [...context.selectedCapabilities, event.capability];
    },
  }),
  removeCapability: assign({
    selectedCapabilities: ({ context, event }: { context: OnboardingContext; event: OnboardingEvent }) => {
      if (event.type !== 'REMOVE_CAPABILITY') {
        return context.selectedCapabilities;
      }

      return context.selectedCapabilities.filter((capability) => capability !== event.capability);
    },
  }),
  setEnvironment: assign({
    environmentConfig: ({ context, event }: { context: OnboardingContext; event: OnboardingEvent }) => {
      if (event.type !== 'CONFIGURE_ENV') {
        return context.environmentConfig;
      }

      return { ...context.environmentConfig, ...event.config };
    },
  }),
  setSpatial: assign({
    spatialPreferences: ({ context, event }: { context: OnboardingContext; event: OnboardingEvent }) => {
      if (event.type !== 'SET_SPATIAL') {
        return context.spatialPreferences;
      }

      return { ...context.spatialPreferences, ...event.prefs };
    },
  }),
  recordInteraction: assign({
    interactionHistory: ({ context, event }: { context: OnboardingContext; event: OnboardingEvent }) => [
      ...context.interactionHistory,
      {
        event: event.type,
        timestamp: Date.now(),
      },
    ],
  }),
  persistState: ({ context }: { context: OnboardingContext }) => {
    persistContext(context);
  },
};