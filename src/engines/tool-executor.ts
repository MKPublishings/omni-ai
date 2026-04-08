/**
 * @module ToolExecutor
 * @spec: tool-execution-contract
 * 
 * Isolated tool execution with timeout, logging, and error handling.
 * Manages the full execution lifecycle:
 * 1. Validation
 * 2. Execution with timeout
 * 3. Logging and audit trail
 * 4. Event emission
 * 5. Response formatting
 */

import type { ToolModule, ToolContext, ToolResult, ToolExecution } from '../types/tool.types';
import { EventBus } from './event-bus';

const EXECUTION_TIMEOUT_MS = 30_000;

export class ToolExecutor {
  private db: D1Database;
  private eventBus: EventBus;

  constructor(db: D1Database, eventBus: EventBus) {
    this.db = db;
    this.eventBus = eventBus;
  }

  /**
   * Execute a tool with full lifecycle management
   * Returns execution result with ID, status, output, and metadata
   */
  async execute(
    tool: ToolModule,
    input: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult & { executionId: string }> {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();
    let regionCode = 'unknown';

    try {
      // Get worker region from Cloudflare context (if available)
      // This will be populated later in the middleware chain
      regionCode = (context as any).region || 'unknown';
    } catch {
      // Ignore
    }

    // Step 1: Validate input against tool's JSON Schema
    const validation = tool.validate ? tool.validate(input) : { valid: true, errors: [] };
    
    // Handle both sync and async validation
    const validationResult = validation instanceof Promise 
      ? await validation 
      : (validation as any);

    if (!validationResult.valid) {
      const durationMs = Date.now() - startTime;

      // Create failed execution record
      const errorMessages = Array.isArray(validationResult.errors)
        ? validationResult.errors.map((e: any) => typeof e === 'string' ? e : e.message).join('; ')
        : 'Unknown validation error';

      await this.createRecord({
        id: executionId,
        sessionId: context.sessionId,
        toolName: tool.name,
        toolVersion: tool.version,
        inputPayload: JSON.stringify(input),
        outputPayload: null,
        status: 'error',
        errorMessage: `Validation failed: ${errorMessages}`,
        durationMs,
        mode: context.mode,
        simulationId: context.simulationId,
        workerRegion: regionCode,
        completedAt: new Date().toISOString(),
      });

      return {
        executionId,
        success: false,
        output: null,
        logs: [`Validation failed:`, ...Array.isArray(validationResult.errors) ? validationResult.errors.map((e: any) => typeof e === 'string' ? `  ${e}` : `  ${e.path}: ${e.message}`) : []],
        duration_ms: durationMs,
        metadata: { validationErrors: validation.errors },
      };
    }

    // Step 2: Create execution record (pending)
    await this.createRecord({
      id: executionId,
      sessionId: context.sessionId,
      toolName: tool.name,
      toolVersion: tool.version,
      inputPayload: JSON.stringify(input),
      outputPayload: null,
      status: 'pending',
      errorMessage: null,
      durationMs: 0,
      mode: context.mode,
      simulationId: context.simulationId,
      workerRegion: regionCode,
      completedAt: null,
    });

    // Step 3: Execute with timeout
    try {
      // Update to running status
      await this.updateStatus(executionId, 'running');

      const result = await this.withTimeout(
        tool.execute(input, context),
        EXECUTION_TIMEOUT_MS
      );

      const durationMs = Date.now() - startTime;

      // Step 4: Record success
      await this.completeRecord(executionId, 'success', result.output, durationMs, null);

      // Emit event
      await this.eventBus.emit('tool.executed', 'tool-executor', {
        executionId,
        toolName: tool.name,
        status: 'success',
        durationMs,
      });

      return { executionId, ...result, duration_ms: durationMs };
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMsg === '__TOOL_EXECUTOR_TIMEOUT__';
      const status = isTimeout ? 'timeout' : 'error';

      await this.completeRecord(executionId, status, null, durationMs, errorMsg);

      // Emit event
      await this.eventBus.emit('tool.executed', 'tool-executor', {
        executionId,
        toolName: tool.name,
        status,
        durationMs,
        error: errorMsg,
      });

      return {
        executionId,
        success: false,
        output: null,
        logs: [`Execution ${status}: ${errorMsg}`],
        duration_ms: durationMs,
        metadata: { error: errorMsg, status },
      };
    }
  }

  /**
   * Get execution record by ID
   */
  async getExecution(id: string): Promise<ToolExecution | null> {
    try {
      const result = await this.db.prepare('SELECT * FROM tool_executions WHERE id = ?').bind(id).first<any>();

      if (!result) return null;

      return {
        id: result.id,
        sessionId: result.session_id,
        toolName: result.tool_name,
        toolVersion: result.tool_version,
        inputPayload: result.input_payload,
        outputPayload: result.output_payload,
        status: result.status,
        errorMessage: result.error_message,
        durationMs: result.duration_ms,
        mode: result.mode,
        simulationId: result.simulation_id,
        workerRegion: result.worker_region,
        createdAt: result.created_at,
        completedAt: result.completed_at,
      };
    } catch (err) {
      console.error('[ToolExecutor.getExecution]', err);
      return null;
    }
  }

  /**
   * List execution records with filters
   */
  async listExecutions(
    sessionId: string,
    options?: {
      toolName?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ executions: ToolExecution[]; total: number }> {
    try {
      let query = 'SELECT * FROM tool_executions WHERE session_id = ?';
      const bindings: any[] = [sessionId];

      if (options?.toolName) {
        query += ' AND tool_name = ?';
        bindings.push(options.toolName);
      }

      if (options?.status) {
        query += ' AND status = ?';
        bindings.push(options.status);
      }

      // Count total
      const countResult = await this.db
        .prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count'))
        .bind(...bindings)
        .first<any>();
      const total = countResult?.count ?? 0;

      // Fetch with pagination
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      bindings.push(limit, offset);

      const result = await this.db.prepare(query).bind(...bindings).all<any>();

      const executions = (result.results ?? []).map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        toolName: row.tool_name,
        toolVersion: row.tool_version,
        inputPayload: row.input_payload,
        outputPayload: row.output_payload,
        status: row.status,
        errorMessage: row.error_message,
        durationMs: row.duration_ms,
        mode: row.mode,
        simulationId: row.simulation_id,
        workerRegion: row.worker_region,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      }));

      return { executions, total };
    } catch (err) {
      console.error('[ToolExecutor.listExecutions]', err);
      return { executions: [], total: 0 };
    }
  }

  /**
   * Wrap a promise with a timeout
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('__TOOL_EXECUTOR_TIMEOUT__')), ms)
      ),
    ]);
  }

  /**
   * Create an execution record in D1
   */
  private async createRecord(data: {
    id: string;
    sessionId: string;
    toolName: string;
    toolVersion: string;
    inputPayload: string;
    outputPayload: string | null;
    status: string;
    errorMessage: string | null;
    durationMs: number;
    mode: string;
    simulationId?: string;
    workerRegion: string;
    completedAt: string | null;
  }): Promise<void> {
    try {
      await this.db
        .prepare(`
          INSERT INTO tool_executions (
            id, session_id, tool_name, tool_version, input_payload, output_payload,
            status, error_message, duration_ms, mode, simulation_id, worker_region,
            created_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        `)
        .bind(
          data.id,
          data.sessionId,
          data.toolName,
          data.toolVersion,
          data.inputPayload,
          data.outputPayload,
          data.status,
          data.errorMessage,
          data.durationMs,
          data.mode,
          data.simulationId ?? null,
          data.workerRegion,
          data.completedAt
        )
        .run();
    } catch (err) {
      console.error('[ToolExecutor.createRecord]', err);
    }
  }

  /**
   * Update execution status
   */
  private async updateStatus(id: string, status: string): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE tool_executions SET status = ? WHERE id = ?')
        .bind(status, id)
        .run();
    } catch (err) {
      console.error('[ToolExecutor.updateStatus]', err);
    }
  }

  /**
   * Mark execution as complete with result
   */
  private async completeRecord(
    id: string,
    status: string,
    output: unknown,
    durationMs: number,
    error?: string
  ): Promise<void> {
    try {
      await this.db
        .prepare(`
          UPDATE tool_executions
          SET status = ?, output_payload = ?, duration_ms = ?, error_message = ?, completed_at = datetime('now')
          WHERE id = ?
        `)
        .bind(status, output ? JSON.stringify(output) : null, durationMs, error ?? null, id)
        .run();
    } catch (err) {
      console.error('[ToolExecutor.completeRecord]', err);
    }
  }
}
