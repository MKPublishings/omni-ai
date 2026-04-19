import type {
  SimulationBridge,
  SimulationBridgeRequest,
  SimulationBridgeResponse,
  WorldAnomaly,
  WorldEventEnvelope,
  WorldKernelStatus,
} from './types';

type FetchLike = typeof fetch;

interface PythonHttpSimulationBridgeOptions {
  endpoint: string;
  fetcher?: FetchLike;
  apiKey?: string;
}

interface SimulationBridgeFactoryOptions {
  endpoint?: string;
  fetcher?: FetchLike;
  apiKey?: string;
}

function cloneEvents(events: WorldEventEnvelope[]): WorldEventEnvelope[] {
  return events.map((event) => ({
    ...event,
    causalityChain: [...event.causalityChain],
    payload: { ...event.payload },
  }));
}

function cloneAnomalies(anomalies: WorldAnomaly[]): WorldAnomaly[] {
  return anomalies.map((anomaly) => ({
    ...anomaly,
    causalityChain: [...anomaly.causalityChain],
  }));
}

function normalizeEvent(event: WorldEventEnvelope): WorldEventEnvelope {
  return {
    ...event,
    causalityChain: [...(event.causalityChain || [])],
    payload: { ...(event.payload || {}) },
  };
}

function normalizeAnomaly(anomaly: WorldAnomaly): WorldAnomaly {
  return {
    ...anomaly,
    causalityChain: [...(anomaly.causalityChain || [])],
  };
}

function normalizeLifecycle(value: unknown): WorldKernelStatus | undefined {
  if (
    value === 'idle' ||
    value === 'initializing' ||
    value === 'running' ||
    value === 'paused' ||
    value === 'persisting' ||
    value === 'error'
  ) {
    return value;
  }
  return undefined;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveAdvanceUrl(value: string): string {
  const endpoint = trimTrailingSlash(value);
  return endpoint.endsWith('/advance') ? endpoint : `${endpoint}/advance`;
}

export class LocalSimulationBridge implements SimulationBridge {
  async advance(request: SimulationBridgeRequest): Promise<SimulationBridgeResponse> {
    const { snapshot, pendingEvents, tick } = request;

    return {
      agents: { ...snapshot.agents },
      environmentPatch: {
        ...snapshot.environment,
        updatedAt: new Date().toISOString(),
      },
      anomalies: cloneAnomalies(snapshot.anomalies),
      events: cloneEvents(
        pendingEvents.map((event) => ({
          ...event,
          tick,
        }))
      ),
      metadata: {
        bridge: 'local-simulation-bridge',
        source: 'typescript-scaffold',
      },
    };
  }

  getCapabilities(): Record<string, unknown> {
    return {
      bridge: 'local-simulation-bridge',
      writableState: true,
      deterministic: true,
      transport: 'in-process',
    };
  }
}

export class PythonHttpSimulationBridge implements SimulationBridge {
  private readonly endpoint: string;
  private readonly advanceUrl: string;
  private readonly fetcher: FetchLike;
  private readonly apiKey?: string;

  constructor(options: PythonHttpSimulationBridgeOptions) {
    this.endpoint = trimTrailingSlash(options.endpoint);
    this.advanceUrl = resolveAdvanceUrl(options.endpoint);
    this.fetcher = options.fetcher || fetch;
    this.apiKey = options.apiKey;
  }

  async advance(request: SimulationBridgeRequest): Promise<SimulationBridgeResponse> {
    const response = await this.fetcher(this.advanceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Python world bridge request failed with status ${response.status}.`);
    }

    const payload = await response.json() as SimulationBridgeResponse;
    return {
      agents: payload.agents ? { ...payload.agents } : undefined,
      environmentPatch: payload.environmentPatch ? { ...payload.environmentPatch } : undefined,
      anomalies: payload.anomalies?.map((anomaly) => normalizeAnomaly(anomaly)),
      events: payload.events?.map((event) => normalizeEvent(event)),
      lifecycle: normalizeLifecycle(payload.lifecycle),
      metadata: {
        ...(payload.metadata || {}),
        bridge: 'python-http-simulation-bridge',
        endpoint: this.endpoint,
      },
    };
  }

  getCapabilities(): Record<string, unknown> {
    return {
      bridge: 'python-http-simulation-bridge',
      writableState: true,
      deterministic: true,
      transport: 'http',
      endpoint: this.advanceUrl,
    };
  }
}

export function createSimulationBridge(options?: SimulationBridgeFactoryOptions): SimulationBridge {
  if (options?.endpoint) {
    return new PythonHttpSimulationBridge(options as PythonHttpSimulationBridgeOptions);
  }
  return new LocalSimulationBridge();
}