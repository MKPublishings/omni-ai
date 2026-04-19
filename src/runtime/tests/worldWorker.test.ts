import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import test from 'node:test';

import { WorldWorker } from '../../api/world-worker';
import { WorldStateBusDurableObject } from '../../world/durable-object';

class MemoryStorage {
  private readonly store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    const value = this.store.get(key);
    return value === undefined ? undefined : structuredClone(value as T);
  }

  async put<T>(key: string, value: T): Promise<void> {
    this.store.set(key, structuredClone(value));
  }
}

class MemoryDurableObjectState {
  readonly storage = new MemoryStorage();

  async blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  }
}

class MemoryDurableObjectNamespace {
  private readonly instances = new Map<string, WorldStateBusDurableObject>();

  constructor(private readonly env?: { WORLD_KERNEL_BRIDGE_URL?: string; WORLD_KERNEL_BRIDGE_TOKEN?: string }) {}

  idFromName(name: string): string {
    return name;
  }

  get(id: string) {
    if (!this.instances.has(id)) {
      this.instances.set(id, new WorldStateBusDurableObject(new MemoryDurableObjectState() as any, this.env));
    }

    const instance = this.instances.get(id)!;
    return {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(String(input), init);
        return instance.fetch(request);
      },
    };
  }
}

function resolvePythonExecutable(): string {
  const workspaceRoot = process.cwd();
  const venvPath = process.platform === 'win32'
    ? join(workspaceRoot, '.venv', 'Scripts', 'python.exe')
    : join(workspaceRoot, '.venv', 'bin', 'python');

  if (existsSync(venvPath)) {
    return venvPath;
  }

  return process.env.PYTHON_EXECUTABLE || 'python';
}

async function waitForBridgeHealth(baseUrl: string, timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    }
    catch {
      // Retry until the server is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for Python world bridge at ${baseUrl}.`);
}

async function startPythonWorldBridge(port: number): Promise<ChildProcessWithoutNullStreams> {
  const child = spawn(resolvePythonExecutable(), ['-m', 'ION_ai.world.run_server'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ION_WORLD_BRIDGE_HOST: '127.0.0.1',
      ION_WORLD_BRIDGE_PORT: String(port),
    },
    stdio: 'pipe',
  });

  child.stderr.on('data', () => {
    return;
  });

  await waitForBridgeHealth(`http://127.0.0.1:${port}`);
  return child;
}

async function stopPythonWorldBridge(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null) {
    return;
  }

  child.kill();
  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
    setTimeout(() => resolve(), 2000);
  });
}

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil(promise: Promise<unknown>) {
      void promise;
    },
    passThroughOnException() {
      return;
    },
  } as ExecutionContext;
}

function createAuthedRequest(url: string, init: RequestInit, sessionId: string, userId = 'user-1'): Request {
  const request = new Request(url, init);
  (request as Request & { authContext?: { sessionId: string; userId: string } }).authContext = {
    sessionId,
    userId,
  };
  return request;
}

test('world worker executes commands and persists state per session', async () => {
  const worker = new WorldWorker();
  const env = {
    WORLD_STATE_BUS: new MemoryDurableObjectNamespace(),
  } as any;

  const spawnResponse = await worker.command(
    createAuthedRequest(
      'https://example.test/api/world/command',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'spawn_agent',
          agent: {
            id: 'agent-1',
            kind: 'operator',
            status: 'active',
            metrics: { focus: 0.82, coherence: 0.91 },
            memory: ['initial directive'],
            tags: ['kernel'],
          },
        }),
      },
      'session-alpha'
    ),
    env,
    createExecutionContext(),
    {}
  );

  assert.equal(spawnResponse.status, 200);
  const spawnPayload = await spawnResponse.json() as { snapshot: { agents: Record<string, { id: string }>; tick: number } };
  assert.equal(spawnPayload.snapshot.tick, 0);
  assert.equal(spawnPayload.snapshot.agents['agent-1']?.id, 'agent-1');

  const stateResponse = await worker.getState(
    createAuthedRequest('https://example.test/api/world/state', { method: 'GET' }, 'session-alpha'),
    env,
    createExecutionContext(),
    {}
  );

  assert.equal(stateResponse.status, 200);
  const statePayload = await stateResponse.json() as { snapshot: { agents: Record<string, { id: string }> } };
  assert.equal(statePayload.snapshot.agents['agent-1']?.id, 'agent-1');

  const eventsResponse = await worker.getEvents(
    createAuthedRequest('https://example.test/api/world/events?limit=5', { method: 'GET' }, 'session-alpha'),
    env,
    createExecutionContext(),
    {}
  );

  assert.equal(eventsResponse.status, 200);
  const eventsPayload = await eventsResponse.json() as { events: Array<{ type: string }> };
  assert.equal(eventsPayload.events.length, 1);
  assert.equal(eventsPayload.events[0]?.type, 'world.agent.spawned');
});

test('world worker isolates durable object state across sessions', async () => {
  const worker = new WorldWorker();
  const env = {
    WORLD_STATE_BUS: new MemoryDurableObjectNamespace(),
  } as any;

  await worker.command(
    createAuthedRequest(
      'https://example.test/api/world/command',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'advance_tick',
          steps: 3,
        }),
      },
      'session-one'
    ),
    env,
    createExecutionContext(),
    {}
  );

  const stateResponse = await worker.getState(
    createAuthedRequest('https://example.test/api/world/state', { method: 'GET' }, 'session-two'),
    env,
    createExecutionContext(),
    {}
  );

  assert.equal(stateResponse.status, 404);
  const payload = await stateResponse.json() as { error: string };
  assert.match(payload.error, /not been initialized/i);
});

test('world worker exposes pause resume and persist lifecycle actions', async () => {
  const worker = new WorldWorker();
  const env = {
    WORLD_STATE_BUS: new MemoryDurableObjectNamespace(),
  } as any;

  await worker.command(
    createAuthedRequest(
      'https://example.test/api/world/command',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'spawn_agent',
          agent: {
            id: 'agent-2',
            kind: 'observer',
            status: 'active',
            metrics: { focus: 0.5 },
            memory: [],
            tags: [],
          },
        }),
      },
      'session-lifecycle'
    ),
    env,
    createExecutionContext(),
    {}
  );

  const pauseResponse = await worker.pause(
    createAuthedRequest(
      'https://example.test/api/world/pause',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'operator' }),
      },
      'session-lifecycle'
    ),
    env,
    createExecutionContext(),
    {}
  );
  const pausePayload = await pauseResponse.json() as { snapshot: { status: string } };
  assert.equal(pauseResponse.status, 200);
  assert.equal(pausePayload.snapshot.status, 'paused');

  const resumeResponse = await worker.resume(
    createAuthedRequest(
      'https://example.test/api/world/resume',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'operator' }),
      },
      'session-lifecycle'
    ),
    env,
    createExecutionContext(),
    {}
  );
  const resumePayload = await resumeResponse.json() as { snapshot: { status: string } };
  assert.equal(resumeResponse.status, 200);
  assert.equal(resumePayload.snapshot.status, 'running');

  const persistResponse = await worker.persist(
    createAuthedRequest(
      'https://example.test/api/world/persist',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'checkpoint' }),
      },
      'session-lifecycle'
    ),
    env,
    createExecutionContext(),
    {}
  );
  const persistPayload = await persistResponse.json() as { snapshot: { metadata: Record<string, unknown> } };
  assert.equal(persistResponse.status, 200);
  assert.equal(typeof persistPayload.snapshot.metadata.lastPersistedAt, 'string');
});

test('world worker can drive advance_tick through the live python bridge', async () => {
  const bridgePort = 8791;
  const bridgeProcess = await startPythonWorldBridge(bridgePort);

  try {
    const worker = new WorldWorker();
    const env = {
      WORLD_STATE_BUS: new MemoryDurableObjectNamespace({
        WORLD_KERNEL_BRIDGE_URL: `http://127.0.0.1:${bridgePort}/advance`,
      }),
    } as any;

    await worker.command(
      createAuthedRequest(
        'https://example.test/api/world/command',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'spawn_agent',
            agent: {
              id: 'agent-python',
              kind: 'operator',
              status: 'active',
              metrics: { coherence: 0.95 },
              memory: ['seed'],
              tags: ['python-bridge'],
            },
          }),
        },
        'session-python-bridge'
      ),
      env,
      createExecutionContext(),
      {}
    );

    const advanceResponse = await worker.command(
      createAuthedRequest(
        'https://example.test/api/world/command',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'advance_tick',
            steps: 1,
          }),
        },
        'session-python-bridge'
      ),
      env,
      createExecutionContext(),
      {}
    );

    assert.equal(advanceResponse.status, 200);
    const advancePayload = await advanceResponse.json() as {
      tick: number;
      snapshot: { metadata: Record<string, unknown> };
      emittedEvents: Array<{ type: string }>;
    };

    assert.equal(advancePayload.tick, 1);
    assert.equal(advancePayload.snapshot.metadata.authoritativeRuntime, 'python');
    assert.ok(
      advancePayload.emittedEvents.some((event) => event.type === 'world.tick.advanced'),
      'expected python bridge to emit world.tick.advanced'
    );
  }
  finally {
    await stopPythonWorldBridge(bridgeProcess);
  }
});