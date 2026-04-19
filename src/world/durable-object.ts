import { SovereignWorldKernel } from './kernel';
import { createSimulationBridge } from './simulation-bridge';
import { InMemoryWorldStateBus } from './state-bus';
import type { WorldCommand, WorldEventEnvelope, WorldStateSnapshot } from './types';

interface WorldStateBusEnv {
  WORLD_KERNEL_BRIDGE_URL?: string;
  WORLD_KERNEL_BRIDGE_TOKEN?: string;
}

const SNAPSHOT_STORAGE_KEY = 'world:snapshot';
const EVENTS_STORAGE_KEY = 'world:events';
const UPDATED_AT_STORAGE_KEY = 'world:updated-at';
const MAX_EVENT_LOG = 256;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function sanitizeLimit(raw: string | null, fallback = 50): number {
  const parsed = Number.parseInt(String(raw || fallback), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(250, Math.max(1, parsed));
}

function isWorldCommand(value: unknown): value is WorldCommand {
  return Boolean(value && typeof value === 'object' && typeof (value as WorldCommand).type === 'string');
}

export class WorldStateBusDurableObject {
  private kernelPromise: Promise<SovereignWorldKernel> | null = null;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env?: WorldStateBusEnv
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      const snapshot = await this.readSnapshot();
      return json({
        ok: true,
        worldId: snapshot?.worldId || null,
        tick: snapshot?.tick || 0,
        version: snapshot?.version || null,
        updatedAt: (await this.state.storage.get<string>(UPDATED_AT_STORAGE_KEY)) || null,
      });
    }

    if (request.method === 'GET' && (url.pathname === '/state' || url.pathname === '/snapshot')) {
      const snapshot = await this.readSnapshot();
      if (!snapshot) {
        return json({ error: 'World state has not been initialized.' }, 404);
      }
      return json({ snapshot });
    }

    if (request.method === 'GET' && url.pathname === '/events') {
      const events = await this.readEvents();
      return json({
        events: events.slice(-sanitizeLimit(url.searchParams.get('limit'))),
        total: events.length,
      });
    }

    if (request.method === 'GET' && url.pathname === '/capabilities') {
      const kernel = await this.getKernel();
      return json({
        transport: 'durable-object',
        consistency: 'single-threaded',
        subscriptions: ['snapshot', 'events'],
        commandTypes: ['spawn_agent', 'inject_event', 'modify_environment', 'run_scenario', 'advance_tick'],
        lifecycleActions: ['pause', 'resume', 'persist'],
        bridgeCapabilities: kernel.getSnapshot().metadata.bridgeCapabilities || {},
      });
    }

    if (request.method === 'POST' && url.pathname === '/command') {
      const body = await request.json().catch(() => null);
      const command = body && typeof body === 'object' && 'command' in body ? (body as { command: unknown }).command : body;

      if (!isWorldCommand(command)) {
        return json({ error: 'Invalid world command payload.' }, 400);
      }

      const kernel = await this.getKernel();
      const result = await kernel.execute(command);
      await this.persist(kernel.getSnapshot(), kernel.getEventLog(MAX_EVENT_LOG));
      return json(result);
    }

    if (request.method === 'POST' && url.pathname === '/lifecycle') {
      const body = await request.json().catch(() => null) as { action?: string; reason?: string } | null;
      const action = String(body?.action || '').trim().toLowerCase();
      const reason = String(body?.reason || 'manual');
      const kernel = await this.getKernel();

      if (action === 'pause') {
        const snapshot = await kernel.pause(reason);
        await this.persist(snapshot, kernel.getEventLog(MAX_EVENT_LOG));
        return json({ action, snapshot });
      }

      if (action === 'resume') {
        const snapshot = await kernel.resume(reason);
        await this.persist(snapshot, kernel.getEventLog(MAX_EVENT_LOG));
        return json({ action, snapshot });
      }

      if (action === 'persist') {
        const snapshot = await kernel.persist(reason);
        await this.persist(snapshot, kernel.getEventLog(MAX_EVENT_LOG));
        return json({ action, snapshot });
      }

      return json({ error: 'Invalid lifecycle action.' }, 400);
    }

    return json({ error: 'Not Found' }, 404);
  }

  private async getKernel(): Promise<SovereignWorldKernel> {
    if (!this.kernelPromise) {
      this.kernelPromise = this.state.blockConcurrencyWhile(async () => {
        const snapshot = await this.readSnapshot();
        const events = await this.readEvents();
        const simulationBridge = createSimulationBridge({
          endpoint: this.env?.WORLD_KERNEL_BRIDGE_URL,
          apiKey: this.env?.WORLD_KERNEL_BRIDGE_TOKEN,
        });
        return new SovereignWorldKernel(new InMemoryWorldStateBus(), simulationBridge, {
          worldId: snapshot?.worldId,
          mode: snapshot?.environment.mode,
          metadata: snapshot?.metadata,
          initialSnapshot: snapshot || undefined,
          initialEvents: events,
        });
      });
    }

    return this.kernelPromise;
  }

  private async readSnapshot(): Promise<WorldStateSnapshot | null> {
    return (await this.state.storage.get<WorldStateSnapshot>(SNAPSHOT_STORAGE_KEY)) || null;
  }

  private async readEvents(): Promise<WorldEventEnvelope[]> {
    return (await this.state.storage.get<WorldEventEnvelope[]>(EVENTS_STORAGE_KEY)) || [];
  }

  private async persist(snapshot: WorldStateSnapshot, events: WorldEventEnvelope[]): Promise<void> {
    const trimmedEvents = events.slice(-MAX_EVENT_LOG);
    await this.state.storage.put(SNAPSHOT_STORAGE_KEY, snapshot);
    await this.state.storage.put(EVENTS_STORAGE_KEY, trimmedEvents);
    await this.state.storage.put(UPDATED_AT_STORAGE_KEY, new Date().toISOString());
  }
}