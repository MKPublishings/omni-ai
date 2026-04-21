import { createActor } from 'xstate';
import { describe, expect, it } from 'vitest';
import { uiStateMachine } from '@/core/state';

describe('UIStateMachine', () => {
  it('switches density branches based on level', () => {
    const actor = createActor(uiStateMachine).start();
    actor.send({ type: 'SET_DENSITY', level: 80 });

    expect(actor.getSnapshot().matches({ density: 'spacious' })).toBe(true);
  });
});