import { resolveionConfig } from '../../config/ion.config';
import { validateionWorkflow, formatValidationErrors } from './workflow-validator';
import type {
  IModelGateway,
  JobStatus,
  ProgressEvent,
} from '../../shared/types';

interface ionPromptResponse {
  prompt_id?: string;
}

interface ionQueueResponse {
  queue_running?: unknown[];
  queue_pending?: unknown[];
}

interface ionHistoryResponse {
  [promptId: string]: {
    status?: {
      completed?: boolean;
      status_str?: string;
    };
    outputs?: Record<string, {
      images?: Array<{
        filename: string;
        subfolder?: string;
        type?: string;
      }>;
    }>;
  };
}

interface ionObjectInfoResponse {
  CheckpointLoaderSimple?: {
    input?: {
      required?: {
        ckpt_name?: [unknown[]?];
      };
    };
  };
}

interface ionErrorBody {
  error?: {
    type?: string;
    message?: string;
    details?: string;
  };
  node_errors?: Record<string, {
    errors?: Array<{
      type?: string;
      message?: string;
      details?: string;
      extra_info?: {
        input_name?: string;
        input_config?: unknown[];
        received_value?: unknown;
      };
    }>;
    class_type?: string;
  }>;
}

interface ionWebSocketMessage {
  type?: string;
  data?: {
    prompt_id?: string;
    node?: string | number;
    value?: unknown;
    status?: {
      queue_running?: number;
      queue_pending?: number;
    };
    execution_error?: string;
  };
}

function extractResponseBodyFromErrorMessage(message: string): string {
  const marker = ' Body: ';
  const index = message.indexOf(marker);
  if (index < 0) {
    return '';
  }
  return message.slice(index + marker.length).trim();
}

function parseionErrorBody(message: string): ionErrorBody | null {
  const bodyText = extractResponseBodyFromErrorMessage(message);
  if (!bodyText) {
    return null;
  }

  try {
    const parsed = JSON.parse(bodyText) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as ionErrorBody;
  } catch {
    return null;
  }
}

function inferCheckpointValidationFailure(errorBody: ionErrorBody): string | null {
  const nodeErrors = errorBody.node_errors || {};
  for (const [nodeId, nodeError] of Object.entries(nodeErrors)) {
    const classType = String(nodeError.class_type || '').trim();
    if (classType !== 'CheckpointLoaderSimple') {
      continue;
    }

    for (const entry of nodeError.errors || []) {
      const inputName = String(entry.extra_info?.input_name || '').trim();
      if (inputName !== 'ckpt_name') {
        continue;
      }

      const receivedValue = String(entry.extra_info?.received_value ?? '').trim();
      const inputConfig = Array.isArray(entry.extra_info?.input_config)
        ? entry.extra_info?.input_config
        : [];
      const allowedValues = Array.isArray(inputConfig[0]) ? inputConfig[0] : [];

      if (allowedValues.length === 0) {
        return [
          `Checkpoint validation failed at node ${nodeId}: ${receivedValue || '(empty ckpt_name)'}.`,
          'ion reports zero available checkpoints (ckpt_name options list is empty).',
          'This is a server model-discovery issue, not a workflow JSON shape issue.',
          'Verify the running ion instance has models in its active models/checkpoints directory and restart ion.',
        ].join(' ');
      }

      if (receivedValue && !allowedValues.includes(receivedValue)) {
        const sample = allowedValues.slice(0, 5).map((value) => String(value)).join(', ');
        return [
          `Checkpoint validation failed at node ${nodeId}: '${receivedValue}' is not in ion's allowed ckpt_name list.`,
          sample ? `Available examples: ${sample}.` : '',
          'Use an exact filename from ion object info (no path, exact extension).',
        ].join(' ').trim();
      }
    }
  }

  return null;
}

function isIonNodeId(key: string): boolean {
  return /^\d+$/.test(String(key).trim());
}

function sanitizeInputValue(value: unknown): unknown {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeInputValue(entry));
  }

  if (value && typeof value === 'object') {
    const sanitizedObject: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const sanitizedEntry = sanitizeInputValue(entry);
      if (sanitizedEntry !== undefined) {
        sanitizedObject[key] = sanitizedEntry;
      }
    }
    return sanitizedObject;
  }

  return value;
}

function sanitizeWorkflowForPrompt(workflow: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [nodeId, nodeValue] of Object.entries(workflow)) {
    if (!isIonNodeId(nodeId) || !nodeValue || typeof nodeValue !== 'object' || Array.isArray(nodeValue)) {
      continue;
    }

    const nodeRecord = nodeValue as Record<string, unknown>;
    const classType = String(nodeRecord.class_type ?? '').trim();
    if (!classType) {
      continue;
    }

    const rawInputs = nodeRecord.inputs;
    const inputs = rawInputs && typeof rawInputs === 'object' && !Array.isArray(rawInputs)
      ? sanitizeInputValue(rawInputs)
      : {};

    sanitized[nodeId] = {
      class_type: classType,
      inputs,
    };
  }

  return sanitized;
}

function getPromptIdFromQueueEntry(entry: unknown): string {
  if (Array.isArray(entry)) {
    return String(entry[1] ?? '').trim();
  }
  if (entry && typeof entry === 'object') {
    const record = entry as Record<string, unknown>;
    return String(record.prompt_id ?? record.promptId ?? '').trim();
  }
  return '';
}

function extractCheckpointFromWorkflowNode(node: unknown): string | null {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const record = node as Record<string, unknown>;
  const classType = String(record.class_type ?? '');
  if (classType !== 'CheckpointLoaderSimple') {
    return null;
  }

  const inputs = record.inputs;
  if (!inputs || typeof inputs !== 'object') {
    return null;
  }

  const checkpoint = String((inputs as Record<string, unknown>).ckpt_name ?? '').trim();
  return checkpoint || null;
}

function extractCheckpointFromWorkflow(workflow: Record<string, unknown>): string | null {
  for (const node of Object.values(workflow)) {
    const checkpoint = extractCheckpointFromWorkflowNode(node);
    if (checkpoint) {
      return checkpoint;
    }
  }

  return null;
}

function findCheckpointLoaderNode(workflow: Record<string, unknown>): Record<string, unknown> | null {
  for (const node of Object.values(workflow)) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      continue;
    }

    const nodeRecord = node as Record<string, unknown>;
    const classType = String(nodeRecord.class_type ?? '').trim();
    if (classType !== 'CheckpointLoaderSimple') {
      continue;
    }

    const inputs = nodeRecord.inputs;
    if (inputs && typeof inputs === 'object' && !Array.isArray(inputs)) {
      return inputs as Record<string, unknown>;
    }

    const newInputs: Record<string, unknown> = {};
    nodeRecord.inputs = newInputs;
    return newInputs;
  }

  return null;
}

function normalizeStatus(value: string | undefined): JobStatus['status'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('error') || normalized.includes('fail')) {
    return 'failed';
  }
  if (normalized.includes('complete')) {
    return 'completed';
  }
  return 'processing';
}

function isBypassableRead403(message: string, path: string): boolean {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('(403)') && normalized.includes(path.toLowerCase());
}

function isBypassableOptionalReadFailure(message: string, path: string): boolean {
  const normalized = String(message || '').toLowerCase();
  const normalizedPath = path.toLowerCase();
  if (!normalized.includes(normalizedPath)) {
    return false;
  }

  return normalized.includes('(403)') || normalized.includes('(404)') || normalized.includes('(405)');
}

export class ionClient implements IModelGateway {
  private readonly config;
  private lastSubmittedCheckpoint: string | null = null;
  private lastHealthFailure: string | null = null;

  constructor(source?: Record<string, unknown>) {
    this.config = resolveionConfig(source);
  }

  async submitWorkflow(workflow: Record<string, unknown>): Promise<{ promptId: string }> {
    const promptWorkflow = sanitizeWorkflowForPrompt(workflow);
    await this.reconcileCheckpointWithServer(promptWorkflow);

    // ===== VALIDATION LAYER =====
    const validationResult = validateionWorkflow(promptWorkflow);
    if (!validationResult.valid) {
      const errorMessage = formatValidationErrors(validationResult);
      throw new Error(`ion workflow validation failed:\n${errorMessage}`);
    }

    // ===== PAYLOAD PREPARATION =====
    let payload: string;
    try {
      payload = JSON.stringify({ prompt: promptWorkflow }, null, 2);
    } catch (e) {
      throw new Error(`Failed to serialize workflow to JSON: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ===== DEBUG LOGGING =====
    if (process.env.ion_DEBUG === '1') {
      console.log('[ionClient] Submitting workflow payload:', payload);
    }

    // ===== SUBMISSION =====
    try {
      const response = await this.fetchJson<ionPromptResponse>(this.config.promptPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
      });

      const promptId = String(response.prompt_id || '').trim();
      if (!promptId) {
        throw new Error('ion did not return a prompt_id.');
      }

      this.lastSubmittedCheckpoint = extractCheckpointFromWorkflow(promptWorkflow);

      return { promptId };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('(400)')) {
          const parsedBody = parseionErrorBody(error.message);
          const checkpointFailure = parsedBody ? inferCheckpointValidationFailure(parsedBody) : null;
          throw new Error(
            `ion rejected the workflow (400 Bad Request). ` +
            `${checkpointFailure || 'Validation passed, but ion found the payload invalid. Check checkpoint availability and node parameters.'} ` +
            `Original error: ${error.message}`
          );
        }
      }
      throw error;
    }
  }

  async getJobStatus(promptId: string): Promise<JobStatus> {
    const [queueResult, historyResult] = await Promise.allSettled([
      this.fetchJson<ionQueueResponse>(this.config.queuePath, { method: 'GET' }),
      this.fetchJson<ionHistoryResponse>(this.config.historyPath(promptId), { method: 'GET' }),
    ]);

    if (historyResult.status === 'rejected') {
      throw historyResult.reason;
    }

    const history = historyResult.value;
    let queue: ionQueueResponse = {};
    if (queueResult.status === 'fulfilled') {
      queue = queueResult.value;
    } else {
      const message = queueResult.reason instanceof Error ? queueResult.reason.message : String(queueResult.reason);
      if (!isBypassableRead403(message, this.config.queuePath)) {
        throw queueResult.reason;
      }
    }

    const historyEntry = history[promptId];
    const queuePending = Array.isArray(queue.queue_pending) ? queue.queue_pending : [];
    const queueRunning = Array.isArray(queue.queue_running) ? queue.queue_running : [];
    const queuedIds = [...queueRunning, ...queuePending].map(getPromptIdFromQueueEntry);

    const queueIndex = queuedIds.indexOf(promptId);
    const completed = Boolean(historyEntry?.status?.completed);

    return {
      promptId,
      status: completed ? 'completed' : normalizeStatus(historyEntry?.status?.status_str),
      queuePosition: queueIndex >= 0 ? queueIndex : queuePending.map(getPromptIdFromQueueEntry).indexOf(promptId),
      step: completed ? 1 : queueRunning.some((entry) => getPromptIdFromQueueEntry(entry) === promptId) ? 1 : 0,
      totalSteps: 1,
    };
  }

  async getOutputImage(promptId: string): Promise<Uint8Array> {
    const history = await this.fetchJson<ionHistoryResponse>(this.config.historyPath(promptId), { method: 'GET' });
    const historyEntry = history[promptId];

    if (!historyEntry?.outputs) {
      throw new Error(`ion history for ${promptId} did not include outputs.`);
    }

    for (const output of Object.values(historyEntry.outputs)) {
      const image = output.images?.[0];
      if (!image?.filename) {
        continue;
      }

      const bytes = await this.fetchBytes(this.config.viewPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: image.filename,
          subfolder: image.subfolder || '',
          type: image.type || 'output',
        }),
      });

      return bytes;
    }

    throw new Error(`ion history for ${promptId} did not include an image output.`);
  }

  async *getProgress(promptId: string): AsyncIterable<ProgressEvent> {
    const maxAttempts = 1100; // 275s at 250ms intervals to stay below a strict 300s ceiling.
    const pollIntervalMs = 250;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const status = await this.getJobStatus(promptId);
      yield {
        promptId,
        status: status.status,
        step: status.step,
        totalSteps: status.totalSteps,
        queuePosition: status.queuePosition,
      };

      if (status.status === 'completed' || status.status === 'failed') {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    // Before failing, try one last query to /history to see if the job actually completed.
    // This handles the case where ion finished but event notification was delayed.
    if (process.env.ion_DEBUG === '1') {
      console.warn(
        `[ionClient] Polling timeout for ${promptId}. Attempting fallback history query...`
      );
    }

    try {
      const fallbackStatus = await this.getJobStatus(promptId);
      if (fallbackStatus.status === 'completed' || fallbackStatus.status === 'failed') {
        yield {
          promptId,
          status: fallbackStatus.status,
          step: fallbackStatus.step,
          totalSteps: fallbackStatus.totalSteps,
          queuePosition: fallbackStatus.queuePosition,
        };
        return;
      }
    } catch {
      // Fallback query also failed; timeout is real.
    }

    throw new Error(
      `Timed out while polling ion progress for ${promptId} ` +
      `(checked ${maxAttempts} times over ~${(maxAttempts * pollIntervalMs) / 1000}s). ` +
      `If the image actually finished rendering, increase ion_REQUEST_TIMEOUT_MS or use WebSocket streaming.`
    );
  }

  /**
   * Streams progress events via WebSocket instead of polling.
   * WebSocket is more reliable than polling and never times out unless the connection drops.
   * Use this if polling is too slow or if you need real-time progress updates.
   */
  async *getProgressWebSocket(promptId: string): AsyncIterable<ProgressEvent> {
    const wsUrl = `${this.config.wsUrl}?clientId=ion-client`;
    let ws: WebSocket | null = null;
    let completed = false;
    const errors: Error[] = [];

    try {
      // Open WebSocket connection
      ws = new WebSocket(wsUrl);

      // Create a promise-based interface for WebSocket events
      const eventQueue: ionWebSocketMessage[] = [];
      let resolveNext: (() => void) | null = null;

      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(String(event.data)) as ionWebSocketMessage;
          eventQueue.push(message);
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
        } catch {
          // Ignore parse errors; skip malformed messages
        }
      });

      ws.addEventListener('error', (event) => {
        errors.push(new Error(`WebSocket connection error: ${String(event)}`));
      });

      ws.addEventListener('close', () => {
        completed = true;
        if (resolveNext) {
          resolveNext();
          resolveNext = null;
        }
      });

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        ws!.addEventListener('open', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      });

      // Listen for execution_complete event for this promptId
      while (!completed && errors.length === 0) {
        // Drain existing messages from queue
        while (eventQueue.length > 0) {
          const message = eventQueue.shift();
          if (!message) continue;

          // Check for execution completion
          if (message.type === 'execution_complete' && message.data?.prompt_id === promptId) {
            yield {
              promptId,
              status: 'completed',
              step: 1,
              totalSteps: 1,
              queuePosition: -1,
            };
            return;
          }

          // Check for execution errors
          if (message.type === 'execution_error' && message.data?.prompt_id === promptId) {
            errors.push(new Error(`Execution error: ${message.data.execution_error || 'unknown'}`));
            break;
          }

          // Yield execution progress events
          if (message.type === 'execution_progress' && message.data?.prompt_id === promptId) {
            const node = String(message.data.node || '');
            const value = message.data.value;
            if (typeof value === 'object' && value !== null && 'max' in value && 'value' in value) {
              yield {
                promptId,
                status: 'processing',
                step: Number(value.value as number) || 0,
                totalSteps: Number(value.max as number) || 1,
                queuePosition: 0,
              };
            }
          }
        }

        // Wait for next message or connection close
        if (!completed && errors.length === 0) {
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
            // Safety timeout: if no messages for 60s, assume stuck
            const timeout = setTimeout(resolve, 60000);
            ws!.addEventListener('message', () => {
              clearTimeout(timeout);
            }, { once: true });
            ws!.addEventListener('close', () => {
              clearTimeout(timeout);
              resolve();
            }, { once: true });
          });
        }
      }

      if (errors.length > 0) {
        throw errors[0];
      }
    } finally {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  }

  async getLoadedModel(): Promise<string | null> {
    if (this.lastSubmittedCheckpoint) {
      return this.lastSubmittedCheckpoint;
    }

    try {
      const objectInfo = await this.fetchJson<ionObjectInfoResponse>(this.config.objectInfoPath, { method: 'GET' });
      const values = objectInfo.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
      if (Array.isArray(values) && values.length === 1) {
        const checkpoint = String(values[0] ?? '').trim();
        if (checkpoint) {
          return checkpoint;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  getLastHealthFailure(): string | null {
    return this.lastHealthFailure;
  }

  private async reconcileCheckpointWithServer(workflow: Record<string, unknown>): Promise<void> {
    const requestedCheckpoint = extractCheckpointFromWorkflow(workflow);
    if (!requestedCheckpoint) {
      return;
    }

    const availableCheckpoints = await this.getAvailableCheckpointsSafe();
    if (!availableCheckpoints || availableCheckpoints.length === 0) {
      return;
    }

    if (availableCheckpoints.includes(requestedCheckpoint)) {
      return;
    }

    const replacement = availableCheckpoints[0];
    const checkpointInputs = findCheckpointLoaderNode(workflow);
    if (!checkpointInputs) {
      return;
    }

    checkpointInputs.ckpt_name = replacement;

    if (process.env.ion_DEBUG === '1') {
      console.warn(
        `[ionClient] Replaced unsupported ckpt_name '${requestedCheckpoint}' with '${replacement}' from ion object_info.`,
      );
    }
  }

  private async getAvailableCheckpointsSafe(): Promise<string[] | null> {
    try {
      const objectInfo = await this.fetchJson<ionObjectInfoResponse>(this.config.objectInfoPath, { method: 'GET' });
      const values = objectInfo.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
      if (!Array.isArray(values)) {
        return null;
      }

      const checkpoints = values
        .map((entry) => String(entry ?? '').trim())
        .filter(Boolean);

      return checkpoints.length > 0 ? checkpoints : [];
    } catch {
      return null;
    }
  }

  async isHealthy(): Promise<boolean> {
    const results = await Promise.allSettled([
      this.fetchJson<ionQueueResponse>(this.config.queuePath, { method: 'GET' }),
      this.fetchJson<ionObjectInfoResponse>(this.config.objectInfoPath, { method: 'GET' }),
    ]);

    const failures = results
      .map((result, index) => ({
        result,
        path: index === 0 ? this.config.queuePath : this.config.objectInfoPath,
      }))
      .filter((entry): entry is { result: PromiseRejectedResult; path: string } => entry.result.status === 'rejected');

    if (failures.length === 0) {
      this.lastHealthFailure = null;
      return true;
    }

    const normalizedFailures = failures.map((entry) => ({
      path: entry.path,
      message: entry.result.reason instanceof Error ? entry.result.reason.message : String(entry.result.reason),
    }));
    const hardFailures = normalizedFailures.filter((entry) => {
      if (entry.path === this.config.objectInfoPath) {
        return !isBypassableOptionalReadFailure(entry.message, entry.path);
      }
      return !isBypassableRead403(entry.message, entry.path);
    });

    if (hardFailures.length === 0) {
      this.lastHealthFailure = null;
      return true;
    }

    this.lastHealthFailure = hardFailures.map((entry) => entry.message).join(' | ');

    return false;
  }

  private async fetchJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchWithTimeout(path, init);
    if (!response.ok) {
      let responseBody = '';
      try {
        responseBody = (await response.text()).trim();
      } catch {
        responseBody = '';
      }

      const bodySuffix = responseBody ? ` Body: ${responseBody.slice(0, 1000)}` : '';
      throw new Error(`ion request failed (${response.status}) for ${path}.${bodySuffix}`);
    }

    return response.json() as Promise<T>;
  }

  private async fetchBytes(path: string, init: RequestInit): Promise<Uint8Array> {
    const response = await this.fetchWithTimeout(path, init);
    if (!response.ok) {
      throw new Error(`ion binary request failed (${response.status}) for ${path}.`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  private async fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    const target = `${this.config.host}${path}`;

    try {
      return await fetch(target, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`ion request timed out after ${this.config.requestTimeoutMs}ms for ${target}.`);
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`ion fetch failed for ${target}: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}