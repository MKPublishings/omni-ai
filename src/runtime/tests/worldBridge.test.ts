import assert from 'node:assert/strict';
import test from 'node:test';

import { LocalSimulationBridge, PythonHttpSimulationBridge, createSimulationBridge } from '../../world';

test('createSimulationBridge falls back to local bridge without endpoint', () => {
  const bridge = createSimulationBridge();

  assert.ok(bridge instanceof LocalSimulationBridge);
});

test('python http simulation bridge posts to configured endpoint and normalizes payload', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const bridge = new PythonHttpSimulationBridge({
    endpoint: 'https://python-bridge.example.test/world',
    fetcher: async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(
        JSON.stringify({
          agents: {
            'agent-1': {
              id: 'agent-1',
              kind: 'operator',
              status: 'active',
              metrics: { coherence: 0.93 },
              memory: ['bridge'],
              tags: ['python'],
              updatedAt: '2026-04-18T00:00:00.000Z',
            },
          },
          environmentPatch: {
            mode: 'sovereign',
            regions: {},
            signals: { stability: 0.88 },
            updatedAt: '2026-04-18T00:00:00.000Z',
          },
          anomalies: [
            {
              id: 'anomaly-1',
              type: 'cooperation_breakdown',
              severity: 'high',
              summary: 'Bridge anomaly',
              tick: 3,
              causalityChain: ['pulse.cooperation'],
              createdAt: '2026-04-18T00:00:00.000Z',
            },
          ],
          events: [
            {
              id: 'evt-1',
              type: 'world.tick.advanced',
              channel: 'kernel',
              priority: 'normal',
              tick: 3,
              source: 'python-world-bridge',
              timestamp: '2026-04-18T00:00:00.000Z',
              payload: { reason: 'bridge' },
              causalityChain: ['bridge'],
            },
          ],
          lifecycle: 'idle',
          metadata: {
            authoritativeRuntime: 'python',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    },
  });

  const response = await bridge.advance({
    tick: 3,
    snapshot: {
      worldId: 'world-1',
      tick: 2,
      version: 'world-1:tick:2',
      status: 'running',
      agents: {},
      environment: {
        mode: 'sovereign',
        regions: {},
        signals: {},
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
      anomalies: [],
      lastEvents: [],
      frame: {
        frameId: 'frame-2',
        tick: 2,
        stateVersion: 'world-1:tick:2',
        createdAt: '2026-04-18T00:00:00.000Z',
        eventIds: [],
        anomalyIds: [],
      },
      metadata: {},
    },
    pendingEvents: [],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, 'https://python-bridge.example.test/world/advance');
  assert.equal(response.lifecycle, 'idle');
  assert.equal(response.metadata?.authoritativeRuntime, 'python');
  assert.equal(response.metadata?.bridge, 'python-http-simulation-bridge');
  assert.equal(response.events?.[0]?.type, 'world.tick.advanced');
});