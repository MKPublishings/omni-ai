export type WorldKernelStatus = 'idle' | 'initializing' | 'running' | 'paused' | 'persisting' | 'error';

export type WorldEventPriority = 'low' | 'normal' | 'high' | 'critical';

export type WorldEventChannel = 'kernel' | 'agent' | 'environment' | 'anomaly' | 'system';

export interface WorldAgentState {
  id: string;
  kind: string;
  status: 'active' | 'suspended' | 'terminated';
  position?: {
    x: number;
    y: number;
    z?: number;
  };
  metrics: Record<string, number>;
  memory: string[];
  tags: string[];
  updatedAt: string;
}

export interface WorldEnvironmentState {
  mode: string;
  regions: Record<string, Record<string, unknown>>;
  signals: Record<string, number>;
  updatedAt: string;
}

export interface WorldAnomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  tick: number;
  causalityChain: string[];
  createdAt: string;
}

export interface WorldEventEnvelope<TPayload = Record<string, unknown>> {
  id: string;
  type: string;
  channel: WorldEventChannel;
  priority: WorldEventPriority;
  tick: number;
  source: string;
  timestamp: string;
  payload: TPayload;
  causalityChain: string[];
}

export interface WorldFrame {
  frameId: string;
  tick: number;
  stateVersion: string;
  createdAt: string;
  eventIds: string[];
  anomalyIds: string[];
}

export interface WorldStateSnapshot {
  worldId: string;
  tick: number;
  version: string;
  status: WorldKernelStatus;
  agents: Record<string, WorldAgentState>;
  environment: WorldEnvironmentState;
  anomalies: WorldAnomaly[];
  lastEvents: WorldEventEnvelope[];
  frame: WorldFrame;
  metadata: Record<string, unknown>;
}

export interface SpawnAgentCommand {
  type: 'spawn_agent';
  agent: Omit<WorldAgentState, 'updatedAt'> & { updatedAt?: string };
}

export interface InjectEventCommand {
  type: 'inject_event';
  event: Omit<WorldEventEnvelope, 'id' | 'timestamp' | 'tick'> & {
    id?: string;
    timestamp?: string;
    tick?: number;
  };
}

export interface ModifyEnvironmentCommand {
  type: 'modify_environment';
  patch: {
    mode?: string;
    regions?: Record<string, Record<string, unknown>>;
    signals?: Record<string, number>;
    metadata?: Record<string, unknown>;
  };
}

export interface RunScenarioCommand {
  type: 'run_scenario';
  scenarioId: string;
  directives: string[];
  targetTicks?: number;
}

export interface AdvanceTickCommand {
  type: 'advance_tick';
  steps?: number;
  reason?: string;
}

export type WorldCommand =
  | SpawnAgentCommand
  | InjectEventCommand
  | ModifyEnvironmentCommand
  | RunScenarioCommand
  | AdvanceTickCommand;

export interface WorldCommandResult {
  accepted: boolean;
  commandType: WorldCommand['type'];
  tick: number;
  snapshot: WorldStateSnapshot;
  emittedEvents: WorldEventEnvelope[];
}

export interface WorldStateSubscriber {
  id: string;
  onSnapshot: (snapshot: WorldStateSnapshot) => void | Promise<void>;
  onEvent?: (event: WorldEventEnvelope) => void | Promise<void>;
}

export interface WorldStateBus {
  publishSnapshot(snapshot: WorldStateSnapshot): Promise<void>;
  publishEvent(event: WorldEventEnvelope): Promise<void>;
  subscribe(subscriber: WorldStateSubscriber): () => void;
  getLatestSnapshot(): WorldStateSnapshot | null;
}

export interface SimulationBridgeRequest {
  tick: number;
  snapshot: WorldStateSnapshot;
  pendingEvents: WorldEventEnvelope[];
}

export interface SimulationBridgeResponse {
  agents?: Record<string, WorldAgentState>;
  environmentPatch?: Partial<WorldEnvironmentState>;
  anomalies?: WorldAnomaly[];
  events?: WorldEventEnvelope[];
  lifecycle?: WorldKernelStatus;
  metadata?: Record<string, unknown>;
}

export interface SimulationBridge {
  advance(request: SimulationBridgeRequest): Promise<SimulationBridgeResponse>;
  getCapabilities(): Record<string, unknown>;
}