import { createActor } from 'xstate';
import { describe, expect, it } from 'vitest';
import { onboardingMachine } from '@/core/state';

describe('OnboardingMachine', () => {
  it('moves from idle to welcome and onward after profile completion', () => {
    const actor = createActor(onboardingMachine).start();

    actor.send({ type: 'NEXT' });
    expect(String(actor.getSnapshot().value)).toBe('welcome');

    actor.send({ type: 'NEXT' });
    actor.send({ type: 'UPDATE_PROFILE', data: { name: 'Ion', role: 'Architect', experience: 'advanced' } });
    actor.send({ type: 'NEXT' });

    expect(String(actor.getSnapshot().value)).toBe('capabilitySelection');
  });
});