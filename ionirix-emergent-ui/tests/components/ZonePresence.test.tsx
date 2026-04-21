import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { reflowEngine } from '@/core/engine';
import { ZonePresence } from '@/components/layout';
import dashboardSchema from '@/core/schema/defaults/dashboard.schema.json';
import type { LayoutSchema } from '@/types';

function PresenceHarness() {
  return (
    <ZonePresence zoneId="command-bar">
      <div>Command Bar Presence</div>
    </ZonePresence>
  );
}

describe('ZonePresence', () => {
  it('removes the zone when visibility becomes hidden', async () => {
    reflowEngine.initialize(dashboardSchema as LayoutSchema);
    const result = reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() });
    reflowEngine.commit(result.layout);

    render(<PresenceHarness />);

    expect(screen.getByText('Command Bar Presence')).toBeInTheDocument();

    const hiddenLayout = {
      ...result.layout,
      zones: {
        ...result.layout.zones,
        'command-bar': {
          ...result.layout.zones['command-bar'],
          visibility: 'hidden' as const,
        },
      },
    } as typeof result.layout;

    act(() => {
      reflowEngine.commit(hiddenLayout);
    });

    await waitFor(() => {
      expect(screen.queryByText('Command Bar Presence')).not.toBeInTheDocument();
    });
  });
});