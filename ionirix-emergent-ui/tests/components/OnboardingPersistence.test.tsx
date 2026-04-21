import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OnboardingShell } from '@/components/onboarding';

describe('OnboardingShell persistence', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('rehydrates the onboarding flow from persisted local storage state', () => {
    window.localStorage.setItem(
      'ionirix:onboarding',
      JSON.stringify({
        currentStep: 3,
        userProfile: { name: 'Ion', role: 'Architect', experience: 'advanced' },
        selectedCapabilities: ['ai', 'spatial'],
        environmentConfig: { theme: 'dark', density: 'comfortable', motionPreference: 'full' },
        spatialPreferences: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 0 },
        interactionHistory: [],
      }),
    );

    render(<OnboardingShell />);

    expect(screen.getByText('Capabilities')).toBeInTheDocument();
  });
});