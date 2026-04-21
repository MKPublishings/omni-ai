import { setup } from 'xstate';
import type { OnboardingContext, OnboardingEvent } from '@/types';
import { onboardingActions } from './actions';
import { onboardingGuards } from './guards';

export const onboardingMachine = setup({
  types: {
    context: {} as OnboardingContext,
    events: {} as OnboardingEvent,
  },
  guards: onboardingGuards,
  actions: onboardingActions as any,
}).createMachine({
  id: 'onboarding',
  initial: 'idle',
  context: {
    currentStep: 0,
    userProfile: { name: '', role: '', experience: null },
    selectedCapabilities: [],
    environmentConfig: {
      theme: 'dark',
      density: 'comfortable',
      motionPreference: 'full',
    },
    spatialPreferences: {
      layoutMode: 'grid',
      sidebarPosition: 'left',
      zoneCount: 0,
    },
    interactionHistory: [],
  },
  states: {
    idle: {
      on: {
        NEXT: { target: 'welcome', actions: ['recordInteraction'] },
      },
    },
    welcome: {
      entry: ['incrementStep'],
      on: {
        NEXT: { target: 'profiling', actions: ['recordInteraction'] },
        SKIP: { target: 'capabilitySelection', actions: ['recordInteraction'] },
      },
    },
    profiling: {
      entry: ['incrementStep'],
      on: {
        UPDATE_PROFILE: { actions: ['updateProfile', 'recordInteraction'] },
        NEXT: {
          target: 'capabilitySelection',
          guard: 'hasProfile',
          actions: ['recordInteraction', 'persistState'],
        },
        BACK: {
          target: 'welcome',
          guard: 'canGoBack',
          actions: ['decrementStep', 'recordInteraction'],
        },
      },
    },
    capabilitySelection: {
      entry: ['incrementStep'],
      on: {
        SELECT_CAPABILITY: { actions: ['addCapability', 'recordInteraction'] },
        REMOVE_CAPABILITY: { actions: ['removeCapability', 'recordInteraction'] },
        NEXT: {
          target: 'environmentSetup',
          guard: 'hasCapabilities',
          actions: ['recordInteraction', 'persistState'],
        },
        BACK: { target: 'profiling', actions: ['decrementStep', 'recordInteraction'] },
      },
    },
    environmentSetup: {
      entry: ['incrementStep'],
      on: {
        CONFIGURE_ENV: { actions: ['setEnvironment', 'recordInteraction'] },
        NEXT: { target: 'spatialCalibration', actions: ['recordInteraction', 'persistState'] },
        BACK: { target: 'capabilitySelection', actions: ['decrementStep', 'recordInteraction'] },
      },
    },
    spatialCalibration: {
      entry: ['incrementStep'],
      on: {
        SET_SPATIAL: { actions: ['setSpatial', 'recordInteraction'] },
        CALIBRATE: { actions: ['recordInteraction'] },
        NEXT: {
          target: 'summary',
          guard: 'isCalibrated',
          actions: ['recordInteraction', 'persistState'],
        },
        BACK: { target: 'environmentSetup', actions: ['decrementStep', 'recordInteraction'] },
      },
    },
    summary: {
      entry: ['incrementStep'],
      on: {
        COMPLETE: { target: 'complete', actions: ['recordInteraction', 'persistState'] },
        BACK: { target: 'spatialCalibration', actions: ['decrementStep', 'recordInteraction'] },
      },
    },
    complete: {
      type: 'final',
      entry: ['persistState'],
    },
  },
} as any);