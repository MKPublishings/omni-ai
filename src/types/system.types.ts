/**
 * @module System Types
 * @spec: system-observability
 * 
 * TypeScript types for system observability and health monitoring.
 * Covers status, metrics, events, and binding validation.
 */

export type SystemEventSeverity = 'info' | 'warn' | 'error' | 'critical';
export type BindingType = 'ai' | 'kv' | 'd1' | 'assets' | 'service';
export type BindingStatus = 'connected' | 'missing' | 'error';

/**
 * System health check response
 */
export interface SystemHealthResponse {
  status: 'ok' | 'degraded' | 'unavailable';
  timestamp: string; // ISO 8601
  version: string;
}

/**
 * Comprehensive system status
 */
export interface SystemStatus {
  healthScore: number; // 0-100 composite score
  uptime: number; // seconds
  version: string;
  lastDeploy: {
    timestamp: string; // ISO 8601
    commitHash: string;
    duration: number; // seconds
  };
  workers: Record<string, WorkerStatus>;
  storage: {
    kvKeys: number;
    d1Rows: number;
    d1SizeMb: number;
  };
  activeSessions: number;
  activeSimulations: number;
}

/**
 * Individual worker health status
 */
export interface WorkerStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastChecked: string; // ISO 8601
  errorRate: number; // percentage
}

/**
 * Binding validation result
 */
export interface BindingInfo {
  name: string;
  type: BindingType;
  status: BindingStatus;
  lastValidated: string; // ISO 8601
  errorMessage?: string;
}

/**
 * Real-time metrics snapshot
 */
export interface SystemMetrics {
  timestamp: string; // ISO 8601
  requestsPerMinute: number;
  errorRate: number; // percentage
  latencyP50: number; // ms
  latencyP95: number; // ms
  latencyP99: number; // ms
  activeSessions: number;
  memoryCount: number;
  toolExecutions: number;
  simulationSteps: number;
}

/**
 * System event record
 */
export interface SystemEvent {
  id: string;
  eventType: string; // e.g., 'memory.cleanup', 'tool.executed', 'simulation.stepped'
  source: string; // originating module
  severity: SystemEventSeverity;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string; // ISO 8601
}

/**
 * WebSocket message for real-time metrics
 */
export interface SystemMetricsMessage {
  type: 'metrics';
  data: SystemMetrics;
}

/**
 * WebSocket message for system events
 */
export interface SystemEventMessage {
  type: 'event';
  data: SystemEvent;
}

/**
 * Union of all WebSocket message types
 */
export type SystemStreamMessage = SystemMetricsMessage | SystemEventMessage;

/**
 * Deployment info
 */
export interface DeploymentInfo {
  timestamp: string; // ISO 8601
  commitHash: string;
  commitMessage?: string;
  duration: number; // seconds
  status: 'success' | 'failed' | 'partial';
  rollbackAvailable: boolean;
}

/**
 * System health scores breakdown
 */
export interface HealthScoreDetails {
  latencyScore: number; // 30% weight: 0-100
  errorRateScore: number; // 30% weight: 0-100
  bindingScore: number; // 25% weight: 0-100
  storageScore: number; // 15% weight: 0-100
  composite: number; // overall 0-100
}

/**
 * Configuration settings stored in CONFIG KV
 */
export interface SystemConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  deployment: DeploymentInfo;
  modeConfigs: Record<string, unknown>;
  maintenanceWindow?: {
    enabled: boolean;
    message: string;
    startTime?: string;
    endTime?: string;
  };
  featureFlags: Record<string, boolean>;
}
