import type {
  SimulationBridge,
  WorldAgentState,
  WorldCommand,
  WorldCommandResult,
  WorldEnvironmentState,
  WorldEventEnvelope,
  WorldStateBus,
  WorldStateSnapshot,
} from './types';

function nowIso(): string {
  return new Date().toISOString();
}

function createEnvironmentState(mode = 'sovereign'): WorldEnvironmentState {
  return {
    mode,
    regions: {},
    signals: {},
    updatedAt: nowIso(),
  };
}

function cloneAgent(agent: WorldAgentState): WorldAgentState {
  return {
    ...agent,
    position: agent.position ? { ...agent.position } : undefined,
    metrics: { ...agent.metrics },
    memory: [...agent.memory],
    tags: [...agent.tags],
  };
}

function cloneEvent(event: WorldEventEnvelope): WorldEventEnvelope {
  return {
    ...event,
    payload: { ...event.payload },
    causalityChain: [...event.causalityChain],
  };
}

function cloneAnomaly(anomaly: WorldStateSnapshot['anomalies'][number]): WorldStateSnapshot['anomalies'][number] {
  return {
    ...anomaly,
    causalityChain: [...anomaly.causalityChain],
  };
}

export class SovereignWorldKernel {
  private tick = 0;
  private status: WorldStateSnapshot['status'] = 'idle';
  private readonly worldId: string;
  private readonly metadata: Record<string, unknown>;
  private readonly agents = new Map<string, WorldAgentState>();
  private readonly anomalies: WorldStateSnapshot['anomalies'] = [];
  private readonly eventLog: WorldEventEnvelope[] = [];
  private environment: WorldEnvironmentState;

  constructor(
    private readonly stateBus: WorldStateBus,
    private readonly simulationBridge: SimulationBridge,
    options?: {
      worldId?: string;
      mode?: string;
      metadata?: Record<string, unknown>;
      initialSnapshot?: WorldStateSnapshot;
      initialEvents?: WorldEventEnvelope[];
    }
  ) {
    const initialSnapshot = options?.initialSnapshot;

    this.worldId = initialSnapshot?.worldId || options?.worldId || 'ionirix-sovereign-world';
    this.environment = initialSnapshot
      ? {
          ...initialSnapshot.environment,
          regions: { ...initialSnapshot.environment.regions },
          signals: { ...initialSnapshot.environment.signals },
        }
      : createEnvironmentState(options?.mode);
    this.metadata = {
      ...initialSnapshot?.metadata,
      ...options?.metadata,
      createdAt: (initialSnapshot?.metadata?.createdAt as string | undefined) || nowIso(),
      bridgeCapabilities: simulationBridge.getCapabilities(),
    };

    if (initialSnapshot) {
      this.tick = initialSnapshot.tick;
      this.status = initialSnapshot.status;

      for (const [agentId, agent] of Object.entries(initialSnapshot.agents)) {
        this.agents.set(agentId, cloneAgent(agent));
      }

      this.anomalies.splice(0, this.anomalies.length, ...initialSnapshot.anomalies.map((anomaly) => cloneAnomaly(anomaly)));
      this.eventLog.splice(
        0,
        this.eventLog.length,
        ...(options?.initialEvents || initialSnapshot.lastEvents).map((event) => cloneEvent(event))
      );
    }
  }

  getSnapshot(): WorldStateSnapshot {
    return this.buildSnapshot();
  }

  getEventLog(limit?: number): WorldEventEnvelope[] {
    const events = limit ? this.eventLog.slice(-limit) : this.eventLog;
    return events.map((event) => cloneEvent(event));
  }

  async pause(reason = 'manual'): Promise<WorldStateSnapshot> {
    this.status = 'paused';
    this.metadata.lastLifecycleAction = { action: 'pause', reason, at: nowIso() };
    this.eventLog.push(
      this.createEvent('world.lifecycle.paused', 'system', 'high', {
        reason,
      })
    );
    const snapshot = this.buildSnapshot();
    await this.stateBus.publishSnapshot(snapshot);
    return snapshot;
  }

  async resume(reason = 'manual'): Promise<WorldStateSnapshot> {
    this.status = 'running';
    this.metadata.lastLifecycleAction = { action: 'resume', reason, at: nowIso() };
    this.eventLog.push(
      this.createEvent('world.lifecycle.resumed', 'system', 'high', {
        reason,
      })
    );
    const snapshot = this.buildSnapshot();
    await this.stateBus.publishSnapshot(snapshot);
    return snapshot;
  }

  async persist(reason = 'manual'): Promise<WorldStateSnapshot> {
    const priorStatus = this.status;
    this.status = 'persisting';
    const persistedAt = nowIso();
    this.metadata.lastPersistedAt = persistedAt;
    this.metadata.lastLifecycleAction = { action: 'persist', reason, at: persistedAt };
    this.eventLog.push(
      this.createEvent('world.lifecycle.persisted', 'system', 'high', {
        reason,
        persistedAt,
      })
    );
    this.status = priorStatus === 'error' ? 'error' : priorStatus === 'paused' ? 'paused' : 'idle';
    const snapshot = this.buildSnapshot();
    await this.stateBus.publishSnapshot(snapshot);
    return snapshot;
  }

  async execute(command: WorldCommand): Promise<WorldCommandResult> {
    if (this.status === 'paused') {
      throw new Error('World kernel is paused.');
    }
    this.status = 'running';
    const emittedEvents: WorldEventEnvelope[] = [];
    let bridgeLifecycle: WorldStateSnapshot['status'] | undefined;

    if (command.type === 'spawn_agent') {
      const agent: WorldAgentState = {
        ...command.agent,
        updatedAt: command.agent.updatedAt || nowIso(),
      };
      this.agents.set(agent.id, cloneAgent(agent));
      emittedEvents.push(
        this.createEvent('world.agent.spawned', 'agent', 'normal', {
          agentId: agent.id,
          kind: agent.kind,
        })
      );
    }

    if (command.type === 'inject_event') {
      emittedEvents.push(
        this.createEvent(command.event.type, command.event.channel, command.event.priority, command.event.payload, {
          source: command.event.source,
          causalityChain: command.event.causalityChain,
        })
      );
    }

    if (command.type === 'modify_environment') {
      this.environment = {
        mode: command.patch.mode || this.environment.mode,
        regions: command.patch.regions || this.environment.regions,
        signals: command.patch.signals || this.environment.signals,
        updatedAt: nowIso(),
      };
      emittedEvents.push(
        this.createEvent('world.environment.modified', 'environment', 'high', {
          mode: this.environment.mode,
          metadata: command.patch.metadata || {},
        })
      );
    }

    if (command.type === 'run_scenario') {
      emittedEvents.push(
        this.createEvent('world.scenario.started', 'system', 'high', {
          scenarioId: command.scenarioId,
          directives: command.directives,
          targetTicks: command.targetTicks || 1,
        })
      );
    }

    const steps =
      command.type === 'advance_tick'
        ? Math.max(1, command.steps || 1)
        : command.type === 'run_scenario'
          ? Math.max(1, command.targetTicks || 1)
          : 0;
    for (let index = 0; index < steps; index += 1) {
      this.tick += 1;
      const bridgeResponse = await this.simulationBridge.advance({
        tick: this.tick,
        snapshot: this.buildSnapshot(),
        pendingEvents: emittedEvents,
      });

      if (bridgeResponse.agents) {
        for (const agent of Object.values(bridgeResponse.agents)) {
          this.agents.set(agent.id, cloneAgent({ ...agent, updatedAt: nowIso() }));
        }
      }

      if (bridgeResponse.environmentPatch) {
        this.environment = {
          ...this.environment,
          ...bridgeResponse.environmentPatch,
          regions: bridgeResponse.environmentPatch.regions || this.environment.regions,
          signals: bridgeResponse.environmentPatch.signals || this.environment.signals,
          updatedAt: nowIso(),
        };
      }

      if (bridgeResponse.anomalies?.length) {
        this.anomalies.splice(0, this.anomalies.length, ...bridgeResponse.anomalies);
      }

      if (bridgeResponse.metadata) {
        Object.assign(this.metadata, bridgeResponse.metadata);
      }

      if (bridgeResponse.lifecycle) {
        bridgeLifecycle = bridgeResponse.lifecycle;
      }

      if (bridgeResponse.events?.length) {
        emittedEvents.push(...bridgeResponse.events.map((event) => cloneEvent(event)));
      }
    }

    for (const event of emittedEvents) {
      this.eventLog.push(cloneEvent(event));
      await this.stateBus.publishEvent(event);
    }

  this.status = bridgeLifecycle && bridgeLifecycle !== 'running' ? bridgeLifecycle : 'idle';
    const snapshot = this.buildSnapshot();
    await this.stateBus.publishSnapshot(snapshot);

    return {
      accepted: true,
      commandType: command.type,
      tick: this.tick,
      snapshot,
      emittedEvents,
    };
  }

  private createEvent(
    type: string,
    channel: WorldEventEnvelope['channel'],
    priority: WorldEventEnvelope['priority'],
    payload: Record<string, unknown>,
    overrides?: {
      source?: string;
      causalityChain?: string[];
    }
  ): WorldEventEnvelope {
    return {
      id: crypto.randomUUID(),
      type,
      channel,
      priority,
      tick: this.tick,
      source: overrides?.source || 'sovereign-world-kernel',
      timestamp: nowIso(),
      payload,
      causalityChain: [...(overrides?.causalityChain || [])],
    };
  }

  private buildSnapshot(): WorldStateSnapshot {
    const version = `${this.worldId}:tick:${this.tick}`;
    const eventTail = this.eventLog.slice(-24).map((event) => cloneEvent(event));

    return {
      worldId: this.worldId,
      tick: this.tick,
      version,
      status: this.status,
      agents: Object.fromEntries([...this.agents.entries()].map(([key, agent]) => [key, cloneAgent(agent)])),
      environment: {
        ...this.environment,
        regions: { ...this.environment.regions },
        signals: { ...this.environment.signals },
      },
      anomalies: this.anomalies.map((anomaly) => cloneAnomaly(anomaly)),
      lastEvents: eventTail,
      frame: {
        frameId: crypto.randomUUID(),
        tick: this.tick,
        stateVersion: version,
        createdAt: nowIso(),
        eventIds: eventTail.map((event) => event.id),
        anomalyIds: this.anomalies.map((anomaly) => anomaly.id),
      },
      metadata: { ...this.metadata },
    };
  }
}