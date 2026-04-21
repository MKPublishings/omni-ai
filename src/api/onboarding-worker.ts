import {
  getCurrentProvisionedWorkspace,
  parseProvisionWorkspaceInput,
  provisionUserWorkspace,
} from '../onboarding/provisioning';

function json(data: unknown, status = 200, cacheControl?: string): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });

  if (cacheControl) {
    headers.set('Cache-Control', cacheControl);
  }

  return new Response(JSON.stringify(data), { status, headers });
}

export class OnboardingWorker {
  constructor(private db?: D1Database) {}

  private ensureDb(): Response | null {
    if (this.db) {
      return null;
    }

    return json({ error: 'Onboarding database is not configured.' }, 503);
  }

  async getCurrentWorkspace(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const userId = request.authContext?.userId;
    if (!userId) {
      return json({ error: 'Unauthorized' }, 401, 'no-store');
    }

    const workspace = await getCurrentProvisionedWorkspace(this.db!, userId);
    return json({ workspace }, 200, 'no-store');
  }

  async provisionWorkspace(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const userId = request.authContext?.userId;
    if (!userId) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = parseProvisionWorkspaceInput(body);
    if (!parsed.ok) {
      return json({ error: parsed.error }, 400);
    }

    const workspace = await provisionUserWorkspace(this.db!, userId, parsed.data, {
      status: 'active',
      source: 'authenticated-onboarding',
    });

    return json({ workspace }, 201);
  }
}
