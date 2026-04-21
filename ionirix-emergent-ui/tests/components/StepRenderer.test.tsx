import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import onboardingSchema from '@/core/schema/defaults/onboarding.schema.json';
import { StepRenderer } from '@/components/onboarding';
import type { StepSchema } from '@/types';

describe('StepRenderer', () => {
  it('renders the welcome step component from schema config', () => {
    const step = onboardingSchema.steps[0] as StepSchema;

    render(
      <StepRenderer
        context={{
          currentStep: 1,
          userProfile: { name: '', role: '', experience: null },
          selectedCapabilities: [],
          environmentConfig: { theme: 'dark', density: 'comfortable', motionPreference: 'full' },
          spatialPreferences: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 0 },
          interactionHistory: [],
        }}
        onEvent={() => undefined}
        stepConfig={step}
      />,
    );

    expect(screen.getByText(/Onboarding that grows around the user/i)).toBeInTheDocument();
  });
});