import { setup } from 'xstate';
import type { UIContext, UIEvent } from '@/types';

export const uiStateMachine = setup({
  types: {
    context: {} as UIContext,
    events: {} as UIEvent,
  },
}).createMachine({
  id: 'ui',
  type: 'parallel',
  context: {
    activeZones: [],
    focusedZone: null,
    densityLevel: 50,
    immersionDepth: 0,
  },
  states: {
    mode: {
      initial: 'default',
      states: {
        default: {
          on: {
            FOCUS_ZONE: { target: 'focused' },
            ENTER_IMMERSIVE: { target: 'immersive' },
          },
        },
        focused: {
          on: {
            BLUR_ZONE: { target: 'default' },
            EXPAND: { target: 'expanded' },
            ENTER_IMMERSIVE: { target: 'immersive' },
          },
        },
        expanded: {
          on: {
            COLLAPSE: { target: 'focused' },
            BLUR_ZONE: { target: 'default' },
          },
        },
        immersive: {
          on: {
            EXIT_IMMERSIVE: { target: 'default' },
          },
        },
        minimal: {
          on: {
            RESET: { target: 'default' },
          },
        },
      },
    },
    density: {
      initial: 'comfortable',
      states: {
        compact: {
          on: {
            SET_DENSITY: { target: 'comfortable' },
          },
        },
        comfortable: {
          on: {
            SET_DENSITY: [
              { target: 'compact', guard: ({ event }) => event.level < 33 },
              { target: 'spacious', guard: ({ event }) => event.level > 66 },
            ],
          },
        },
        spacious: {
          on: {
            SET_DENSITY: { target: 'comfortable' },
          },
        },
      },
    },
  },
});