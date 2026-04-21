import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OnboardingShell } from '@/components/onboarding';

describe('OnboardingShell', () => {
  it('renders the workspace header', () => {
    render(<OnboardingShell />);
    expect(screen.getByText('Ionirix Workspace Scaffold')).toBeInTheDocument();
  });
});