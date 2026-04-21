import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardShell } from '@/components/workspace';

describe('DashboardShell', () => {
  it('renders the dashboard surface heading', () => {
    render(<DashboardShell />);
    expect(screen.getByText('Ionirix Dashboard Shell')).toBeInTheDocument();
    expect(screen.getByText('Command Center')).toBeInTheDocument();
  });
});