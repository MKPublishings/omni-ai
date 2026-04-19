import type { RouteParams } from '../router';
import type { WorldCommand } from '../world';

type WorldWorkerEnv = {
  WORLD_STATE_BUS?: DurableObjectNamespace;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function sanitizeWorldName(value: string): string {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9:_-]+/g, '-')
    .replace(/-+/g, '-');

  return normalized || `world:${crypto.randomUUID()}`;
}

function isWorldCommand(value: unknown): value is WorldCommand {
  return Boolean(value && typeof value === 'object' && typeof (value as WorldCommand).type === 'string');
}

export class WorldWorker {
  async command(request: Request, env: WorldWorkerEnv, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    void ctx;
    void params;

    const sessionId = request.authContext?.sessionId;
    if (!sessionId) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (!env.WORLD_STATE_BUS?.idFromName || !env.WORLD_STATE_BUS?.get) {
      return json({ error: 'WORLD_STATE_BUS durable object binding is not configured.' }, 501);
    }

    const body = await request.json().catch(() => null);
    const requestedWorldId = body && typeof body === 'object' && 'worldId' in body ? (body as { worldId?: unknown }).worldId : undefined;
    const command = body && typeof body === 'object' && 'command' in body ? (body as { command?: unknown }).command : body;

    if (!isWorldCommand(command)) {
      return json({ error: 'Invalid world command payload.' }, 400);
    }

    const stub = this.getWorldStub(env, sessionId, requestedWorldId);
    return stub.fetch('https://world-state/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
  }

  async getState(request: Request, env: WorldWorkerEnv, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    return this.forwardGet(request, env, '/state', ctx, params);
  }

  async getEvents(request: Request, env: WorldWorkerEnv, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    return this.forwardGet(request, env, '/events', ctx, params);
  }

  async getCapabilities(request: Request, env: WorldWorkerEnv, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    return this.forwardGet(request, env, '/capabilities', ctx, params);
  }

  async getHealth(request: Request, env: WorldWorkerEnv, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    return this.forwardGet(request, env, '/health', ctx, params);
  }

  async pause(request: Request, env: WorldWorkerEnv, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    return this.forwardLifecycle(request, env, 'pause', ctx, params);
  }

  async resume(request: Request, env: WorldWorkerEnv, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    return this.forwardLifecycle(request, env, 'resume', ctx, params);
  }

  async persist(request: Request, env: WorldWorkerEnv, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    return this.forwardLifecycle(request, env, 'persist', ctx, params);
  }

  private async forwardGet(
    request: Request,
    env: WorldWorkerEnv,
    path: '/state' | '/events' | '/capabilities' | '/health',
    ctx: ExecutionContext,
    params: RouteParams
  ): Promise<Response> {
    void ctx;
    void params;

    const sessionId = request.authContext?.sessionId;
    if (!sessionId) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (!env.WORLD_STATE_BUS?.idFromName || !env.WORLD_STATE_BUS?.get) {
      return json({ error: 'WORLD_STATE_BUS durable object binding is not configured.' }, 501);
    }

    const url = new URL(request.url);
    const stub = this.getWorldStub(env, sessionId, url.searchParams.get('worldId'));
    const target = new URL(`https://world-state${path}`);

    if (path === '/events' && url.searchParams.get('limit')) {
      target.searchParams.set('limit', String(url.searchParams.get('limit')));
    }

    return stub.fetch(target.toString(), { method: 'GET' });
  }

  private getWorldStub(env: WorldWorkerEnv, sessionId: string, worldId?: unknown) {
    const worldName = sanitizeWorldName(String(worldId || `world:${sessionId}`));
    const id = env.WORLD_STATE_BUS!.idFromName(worldName);
    return env.WORLD_STATE_BUS!.get(id);
  }

  private async forwardLifecycle(
    request: Request,
    env: WorldWorkerEnv,
    action: 'pause' | 'resume' | 'persist',
    ctx: ExecutionContext,
    params: RouteParams
  ): Promise<Response> {
    void ctx;
    void params;

    const sessionId = request.authContext?.sessionId;
    if (!sessionId) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (!env.WORLD_STATE_BUS?.idFromName || !env.WORLD_STATE_BUS?.get) {
      return json({ error: 'WORLD_STATE_BUS durable object binding is not configured.' }, 501);
    }

    const body = await request.json().catch(() => null) as { worldId?: unknown; reason?: unknown } | null;
    const stub = this.getWorldStub(env, sessionId, body?.worldId);
    return stub.fetch('https://world-state/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        reason: typeof body?.reason === 'string' ? body.reason : 'manual',
      }),
    });
  }
}