import assert from 'node:assert/strict';
import test from 'node:test';

import { EventBus } from '../../engines/event-bus';
import { SimulationWorker } from '../../api/simulation-worker';

type SimulationRunRow = {
  id: string;
  session_id: string;
  mode: string;
  config: string;
  seed: string | null;
  status: string;
  current_step: number;
  max_steps: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type SimulationSnapshotRow = {
  id: string;
  simulation_id: string;
  step: number;
  state_blob: string;
  delta_blob: string;
  checksum: string;
  created_at: string;
};

class MockD1Database {
  runs = new Map<string, SimulationRunRow>();
  snapshots = new Map<string, SimulationSnapshotRow[]>();

  prepare(query: string) {
    return new MockD1PreparedStatement(this, query);
  }
}

class MockD1PreparedStatement {
  private args: unknown[] = [];

  constructor(
    private readonly db: MockD1Database,
    private readonly query: string
  ) {}

  bind(...args: unknown[]) {
    this.args = args;
    return this;
  }

  async first<T>(): Promise<T | null> {
    if (this.query.includes('SELECT * FROM simulation_runs WHERE id = ? AND session_id = ?')) {
      const [id, sessionId] = this.args as [string, string];
      const row = this.db.runs.get(id);
      return (row && row.session_id === sessionId ? ({ ...row } as T) : null);
    }

    if (this.query.includes('SELECT * FROM simulation_runs WHERE id = ?')) {
      const [id] = this.args as [string];
      const row = this.db.runs.get(id);
      return (row ? ({ ...row } as T) : null);
    }

    if (this.query.includes('SELECT * FROM simulation_snapshots WHERE simulation_id = ? ORDER BY step DESC LIMIT 1')) {
      const [simulationId] = this.args as [string];
      const rows = this.db.snapshots.get(simulationId) || [];
      const row = [...rows].sort((left, right) => right.step - left.step)[0];
      return (row ? ({ ...row } as T) : null);
    }

    if (this.query.includes('SELECT state_blob FROM simulation_snapshots WHERE simulation_id = ? AND step = ?')) {
      const [simulationId, step] = this.args as [string, number];
      const row = (this.db.snapshots.get(simulationId) || []).find((entry) => entry.step === step);
      return (row ? ({ state_blob: row.state_blob } as T) : null);
    }

    if (this.query.includes('SELECT COUNT(*) as count FROM simulation_runs WHERE session_id = ?')) {
      const [sessionId] = this.args as [string];
      const count = [...this.db.runs.values()].filter((row) => row.session_id === sessionId).length;
      return ({ count } as T);
    }

    return null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    if (this.query.includes('SELECT * FROM simulation_runs WHERE session_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')) {
      const [sessionId, limit, offset] = this.args as [string, number, number];
      const results = [...this.db.runs.values()]
        .filter((row) => row.session_id === sessionId)
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(offset, offset + limit) as T[];
      return { results };
    }

    return { results: [] };
  }

  async run<T>(): Promise<T & { meta: { changes: number } }> {
    if (this.query.includes('INSERT INTO simulation_runs')) {
      const [id, sessionId, mode, config, seed, maxSteps, createdAt, updatedAt] = this.args as [
        string,
        string,
        string,
        string,
        string | null,
        number | null,
        string,
        string,
      ];

      this.db.runs.set(id, {
        id,
        session_id: sessionId,
        mode,
        config,
        seed,
        status: 'initializing',
        current_step: 0,
        max_steps: maxSteps,
        created_at: createdAt,
        updated_at: updatedAt,
        completed_at: null,
      });

      return { meta: { changes: 1 } } as T & { meta: { changes: number } };
    }

    if (this.query.includes('INSERT INTO simulation_snapshots')) {
      const [id, simulationId, step, stateBlob, deltaBlob, checksum] = this.args as [
        string,
        string,
        number,
        string,
        string,
        string,
      ];

      const rows = this.db.snapshots.get(simulationId) || [];
      rows.push({
        id,
        simulation_id: simulationId,
        step,
        state_blob: stateBlob,
        delta_blob: deltaBlob,
        checksum,
        created_at: new Date().toISOString(),
      });
      this.db.snapshots.set(simulationId, rows);

      return { meta: { changes: 1 } } as T & { meta: { changes: number } };
    }

    if (this.query.includes("UPDATE simulation_runs\n           SET status = 'running', current_step = 0")) {
      const [id] = this.args as [string];
      const row = this.db.runs.get(id);
      if (row) {
        row.status = 'running';
        row.current_step = 0;
        row.updated_at = new Date().toISOString();
      }
      return { meta: { changes: row ? 1 : 0 } } as T & { meta: { changes: number } };
    }

    if (this.query.includes('UPDATE simulation_runs\n           SET current_step = ?, updated_at = datetime(\'now\')')) {
      const [step, id] = this.args as [number, string];
      const row = this.db.runs.get(id);
      if (row) {
        row.current_step = step;
        row.updated_at = new Date().toISOString();
      }
      return { meta: { changes: row ? 1 : 0 } } as T & { meta: { changes: number } };
    }

    if (this.query.includes("UPDATE simulation_runs\n         SET current_step = ?, status = 'running'")) {
      const [step, id] = this.args as [number, string];
      const row = this.db.runs.get(id);
      if (row) {
        row.current_step = step;
        row.status = 'running';
        row.updated_at = new Date().toISOString();
      }
      return { meta: { changes: row ? 1 : 0 } } as T & { meta: { changes: number } };
    }

    if (this.query.includes("UPDATE simulation_runs\n         SET status = 'terminated'")) {
      const [id] = this.args as [string];
      const row = this.db.runs.get(id);
      if (row) {
        row.status = 'terminated';
        row.completed_at = new Date().toISOString();
        row.updated_at = new Date().toISOString();
      }
      return { meta: { changes: row ? 1 : 0 } } as T & { meta: { changes: number } };
    }

    if (this.query.includes('DELETE FROM simulation_snapshots WHERE simulation_id = ? AND step > ?')) {
      const [simulationId, step] = this.args as [string, number];
      const rows = this.db.snapshots.get(simulationId) || [];
      const filtered = rows.filter((entry) => entry.step <= step);
      this.db.snapshots.set(simulationId, filtered);
      return { meta: { changes: rows.length - filtered.length } } as T & { meta: { changes: number } };
    }

    return { meta: { changes: 0 } } as T & { meta: { changes: number } };
  }
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

function createAuthedRequest(url: string, init: RequestInit, sessionId: string): Request {
  const request = new Request(url, init);
  (request as Request & { authContext?: { sessionId: string; userId: string } }).authContext = {
    sessionId,
    userId: `${sessionId}-user`,
  };
  return request;
}

class MockSimulationSocket {
  messages: Array<Record<string, unknown>> = [];
  closed = false;
  closeCode: number | null = null;
  closeReason = '';
  private listeners = new Map<string, Array<() => void>>();

  send(payload: string) {
    this.messages.push(JSON.parse(payload) as Record<string, unknown>);
  }

  close(code?: number, reason?: string) {
    this.closed = true;
    this.closeCode = code ?? null;
    this.closeReason = reason ?? '';
    this.emit('close');
  }

  addEventListener(type: string, listener: () => void) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(listener);
    this.listeners.set(type, handlers);
  }

  private emit(type: string) {
    for (const listener of this.listeners.get(type) || []) {
      listener();
    }
  }
}

test('simulation worker initializes multiverse runs with deterministic entities', async () => {
  const worker = new SimulationWorker(new MockD1Database() as unknown as D1Database, new EventBus());

  const response = await worker.init(
    createAuthedRequest(
      'https://example.test/api/simulation/init',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'multiverse',
          seed: '0x7a3f9c2e1b8d4f06',
          config: {
            query: {
              lodLevel: 3,
              radius: 40,
              maxResults: 12,
            },
          },
        }),
      },
      'session-multiverse'
    ),
    {},
    createExecutionContext(),
    {}
  );

  assert.equal(response.status, 201);
  const payload = await response.json() as { status: string; state: { stepNumber: number; entities: Array<{ type: string }> ; environment: { mode: string } } };
  assert.equal(payload.status, 'running');
  assert.equal(payload.state.stepNumber, 0);
  assert.equal(payload.state.environment.mode, 'multiverse');
  assert.ok(payload.state.entities.length > 0);
  assert.equal(payload.state.entities[0]?.type, 'galaxy_cluster');
});

test('simulation worker advances cosmic runs through sovereign world state', async () => {
  const database = new MockD1Database();
  const worker = new SimulationWorker(database as unknown as D1Database, new EventBus());

  const initResponse = await worker.init(
    createAuthedRequest(
      'https://example.test/api/simulation/init',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'cosmic',
          config: {
            worldId: 'cosmic-alpha',
          },
        }),
      },
      'session-cosmic'
    ),
    {},
    createExecutionContext(),
    {}
  );

  const initPayload = await initResponse.json() as { simulationId: string; state: { entities: Array<{ id: string }>; environment: { status: string } } };
  assert.equal(initResponse.status, 201);
  assert.equal(initPayload.state.entities.length, 2);
  assert.equal(initPayload.state.environment.status, 'idle');

  const stepResponse = await worker.step(
    createAuthedRequest(
      'https://example.test/api/simulation/step',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationId: initPayload.simulationId,
          count: 2,
        }),
      },
      'session-cosmic'
    ),
    {},
    createExecutionContext(),
    {}
  );

  assert.equal(stepResponse.status, 200);
  const stepPayload = await stepResponse.json() as {
    step: number;
    state: {
      stepNumber: number;
      environment: { worldId: string; status: string; anomalyCount: number };
      metadata: { source: string; sovereignWorld: { snapshot: { tick: number } } };
    };
  };

  assert.equal(stepPayload.step, 2);
  assert.equal(stepPayload.state.stepNumber, 2);
  assert.equal(stepPayload.state.environment.worldId, 'cosmic-alpha');
  assert.equal(stepPayload.state.environment.status, 'idle');
  assert.equal(stepPayload.state.metadata.source, 'sovereign-world-kernel');
  assert.equal(stepPayload.state.metadata.sovereignWorld.snapshot.tick, 2);
});

test('simulation worker enforces session ownership for state lookups', async () => {
  const database = new MockD1Database();
  const worker = new SimulationWorker(database as unknown as D1Database, new EventBus());

  const initResponse = await worker.init(
    createAuthedRequest(
      'https://example.test/api/simulation/init',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'environment',
          config: {},
        }),
      },
      'owner-session'
    ),
    {},
    createExecutionContext(),
    {}
  );

  const initPayload = await initResponse.json() as { simulationId: string };

  const stateResponse = await worker.getState(
    createAuthedRequest(
      `https://example.test/api/simulation/state?id=${initPayload.simulationId}`,
      { method: 'GET' },
      'other-session'
    ),
    {},
    createExecutionContext(),
    {}
  );

  assert.equal(stateResponse.status, 404);
});

test('simulation worker streams latest state updates for sovereign runs', async () => {
  const database = new MockD1Database();
  const worker = new SimulationWorker(database as unknown as D1Database, new EventBus());

  const initResponse = await worker.init(
    createAuthedRequest(
      'https://example.test/api/simulation/init',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'cosmic',
          config: {
            worldId: 'stream-world',
          },
        }),
      },
      'stream-session'
    ),
    {},
    createExecutionContext(),
    {}
  );

  const initPayload = await initResponse.json() as { simulationId: string };
  const socket = new MockSimulationSocket();

  await worker.handleWebSocket(socket as unknown as WebSocket, initPayload.simulationId, {
    sessionId: 'stream-session',
    pollIntervalMs: 20,
  });

  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(socket.messages[0]?.type, 'connection');
  assert.equal(socket.messages[1]?.type, 'snapshot');

  await worker.step(
    createAuthedRequest(
      'https://example.test/api/simulation/step',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationId: initPayload.simulationId,
          count: 1,
        }),
      },
      'stream-session'
    ),
    {},
    createExecutionContext(),
    {}
  );

  await new Promise((resolve) => setTimeout(resolve, 140));
  const updateMessage = socket.messages.find((message) => message.type === 'update');
  assert.ok(updateMessage, 'expected an update message after stepping the simulation');
  assert.equal((updateMessage?.state as { stepNumber?: number } | undefined)?.stepNumber, 1);
  assert.equal((updateMessage?.simulation as { current_step?: number } | undefined)?.current_step, 1);

  socket.close(1000, 'test complete');
});