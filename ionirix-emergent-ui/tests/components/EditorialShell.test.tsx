import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorialShell } from '@/components/workspace';

describe('EditorialShell', () => {
  it('renders the editorial surface heading', () => {
    render(<EditorialShell />);
    expect(screen.getByText('Ionirix Editorial Shell')).toBeInTheDocument();
    expect(screen.getByText('Canvas')).toBeInTheDocument();
  });
});