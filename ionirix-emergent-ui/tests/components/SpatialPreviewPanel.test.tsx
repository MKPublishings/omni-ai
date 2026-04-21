import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpatialPreviewPanel } from '@/components/modules';

describe('SpatialPreviewPanel', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('applies a derived calibration from the interactive preview surface', () => {
    const onCalibrate = vi.fn();

    render(
      <SpatialPreviewPanel
        calibration={{ layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 }}
        recommendation={{ layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 }}
        onCalibrate={onCalibrate}
        surfaceId="test-surface"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply Calibration' }));

    expect(onCalibrate).toHaveBeenCalledWith(
      expect.objectContaining({
        layoutMode: expect.any(String),
        sidebarPosition: expect.any(String),
        zoneCount: expect.any(Number),
      }),
    );
  });

  it('persists a calibration draft per surface', () => {
    render(
      <SpatialPreviewPanel
        calibration={{ layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 }}
        recommendation={{ layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 }}
        onCalibrate={() => undefined}
        surfaceId="persisted-surface"
      />,
    );

    expect(window.localStorage.getItem('ionirix:calibration-draft:persisted-surface')).toContain('width');
  });

  it('persists and renders calibration history entries', () => {
    render(
      <SpatialPreviewPanel
        calibration={{ layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 }}
        recommendation={{ layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 }}
        onCalibrate={() => undefined}
        surfaceId="history-surface"
        machineState="environmentSetup"
        currentStep={4}
        selectedCapabilities={['spatial']}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply Calibration' }));

    expect(window.localStorage.getItem('ionirix:calibration-history:history-surface')).toContain('layoutMode');
    expect(window.localStorage.getItem('ionirix:calibration-history:history-surface')).toContain('environmentSetup');
    expect(window.localStorage.getItem('ionirix:calibration-history:history-surface')).toContain('spatial');
    expect(screen.getByText('Recent Calibration History')).toBeInTheDocument();
    expect(screen.getByText(/environmentSetup/i)).toBeInTheDocument();
  });
});