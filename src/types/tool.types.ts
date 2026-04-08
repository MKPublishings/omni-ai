/**
 * @module Tool Types
 * @spec: tool-execution-contract
 * 
 * TypeScript types for the tool execution subsystem.
 * Covers tool definitions, execution, validation, and logging.
 */

import type { MemoryEngine } from '../engines/memory-engine';
import type { CodexBridge } from '../engines/codex-bridge';

export type ToolCategory = 'simulation' | 'analysis' | 'generation' | 'diagnostics' | 'codex' | 'system';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'timeout';

/**
 * A tool module definition.
 * Defines the interface, schema, and execution logic for a tool.
 */
export interface ToolModule {
  name: string; // unique tool identifier
  version: string; // semver
  category: ToolCategory;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema for input validation
  outputSchema: Record<string, unknown>; // JSON Schema for output shape
  execute: (input: unknown, context: ToolContext) => Promise<ToolResult>;
  validate: (input: unknown) => ValidationResult;
}

/**
 * Context passed to a tool during execution.
 * Provides access to databases, engines, and environment.
 */
export interface ToolContext {
  sessionId: string;
  mode: string; // active cognitive mode
  simulationId?: string; // if invoked within a simulation
  memoryEngine: MemoryEngine; // read/write memory
  codexBridge: CodexBridge; // read/write codex
  db: D1Database; // direct D1 access if needed
  env: any; // worker environment bindings
  namespace?: {
    MIND?: KVNamespace;
    MEMORY?: KVNamespace;
    SESSION?: KVNamespace;
    CACHE?: KVNamespace;
    CONFIG?: KVNamespace;
  };
}

/**
 * Result returned from tool execution
 */
export interface ToolResult {
  success: boolean;
  output: unknown; // tool-specific output
  logs: string[]; // execution logs
  duration_ms: number;
  metadata: Record<string, unknown>;
}

/**
 * Validation result for tool input
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string; // JSON path to error (e.g., "$.input.count")
    message: string;
    keyword: string; // JSON Schema keyword that failed (e.g., "type", "minimum")
  }>;
}

/**
 * Execution record stored in D1
 */
export interface ToolExecution {
  id: string;
  sessionId: string;
  toolName: string;
  toolVersion: string;
  inputPayload: string; // JSON stringified
  outputPayload: string | null; // JSON stringified
  status: ExecutionStatus;
  errorMessage: string | null;
  durationMs: number;
  mode: string | null;
  simulationId: string | null;
  workerRegion: string;
  createdAt: string; // ISO 8601
  completedAt: string | null; // ISO 8601
}

/**
 * Request body for tool execution
 */
export interface ToolExecuteRequest {
  tool: string;
  input: Record<string, unknown>;
  options?: {
    timeout?: number; // ms, max 30000
    dryRun?: boolean;
    simulationId?: string;
  };
}

/**
 * Response from tool execution endpoint
 */
export interface ToolExecuteResponse {
  executionId: string;
  tool: string;
  status: 'success' | 'error';
  output: unknown;
  logs: string[];
  durationMs: number;
  metadata: Record<string, unknown>;
}

/**
 * Tool registry entry with metadata
 */
export interface ToolRegistry Entry {
  name: string;
  version: string;
  category: ToolCategory;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

/**
 * Tool diagnostics summary
 */
export interface ToolDiagnostics {
  tool: string;
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  timeoutCount: number;
  errorRate: number; // percentage
  avgDurationMs: number;
  p95DurationMs: number;
  lastExecution: string | null; // ISO 8601
  lastError: string | null;
}
