import {
  createSession,
  createUser,
  findUserByEmail,
  findUserByIdentifier,
  getSessionByToken,
  pruneExpiredSessions,
  revokeSessionByToken,
  touchSession,
  validateEmail,
  validatePassword,
  validateUsername,
  verifyPassword,
} from '../auth/credentials';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = request.headers.get('Cookie') || request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(/(?:^|;\s*)ion_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getRequestBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export class AuthWorker {
  constructor(private db?: D1Database) {}

  private ensureDb(): Response | null {
    if (this.db) {
      return null;
    }

    return json(
      {
        error: 'Auth database is not configured.',
        code: 'AUTH_DB_NOT_CONFIGURED',
      },
      503
    );
  }

  async signup(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const body = getRequestBody(await request.json().catch(() => null));
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const displayName = String(body?.displayName || '').trim();
    const username = String(body?.username || '').trim();

    if (!displayName || displayName.length < 2) {
      return json({ error: 'Display name must be at least 2 characters.' }, 400);
    }
    if (!validateEmail(email)) {
      return json({ error: 'A valid email address is required.' }, 400);
    }
    if (username && !validateUsername(username)) {
      return json({ error: 'Username must be 3-32 characters and use letters, numbers, dots, dashes, or underscores.' }, 400);
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return json({ error: passwordCheck.error }, 400);
    }

    const existingUser = await findUserByEmail(this.db!, email);
    if (existingUser) {
      return json({ error: 'An account with that email already exists.' }, 409);
    }

    const user = await createUser(this.db!, { email, password, displayName, username });
    const { token, session } = await createSession(this.db!, user.id, request);

    return json({
      token,
      sessionId: session.id,
      expiresAt: session.expires_at,
      user,
    }, 201);
  }

  async login(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const body = getRequestBody(await request.json().catch(() => null));
    const identifier = String(body?.identifier || body?.email || body?.username || '').trim();
    const password = String(body?.password || '');

    if (!identifier || !password) {
      return json({ error: 'Username or email and password are required.' }, 400);
    }

    const userRecord = await findUserByIdentifier(this.db!, identifier);
    if (!userRecord) {
      return json({ error: 'Invalid username/email or password.' }, 401);
    }

    const passwordMatches = await verifyPassword(password, userRecord.password_hash);
    if (!passwordMatches) {
      return json({ error: 'Invalid username/email or password.' }, 401);
    }

    await pruneExpiredSessions(this.db!);
    const { token, session } = await createSession(this.db!, userRecord.id, request);

    return json({
      token,
      sessionId: session.id,
      expiresAt: session.expires_at,
      user: {
        id: userRecord.id,
        username: userRecord.username,
        email: userRecord.email,
        displayName: userRecord.display_name,
        role: userRecord.role,
        emailVerified: userRecord.email_verified === 1,
      },
    });
  }

  async me(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const token = getBearerToken(request);
    if (!token) {
      return json({ error: 'No auth token provided.' }, 401);
    }

    const auth = await getSessionByToken(this.db!, token);
    if (!auth) {
      return json({ error: 'Invalid or expired session.' }, 401);
    }

    await touchSession(this.db!, auth.session.id);
    return json({ user: auth.user, sessionId: auth.session.id, expiresAt: auth.session.expires_at });
  }

  async logout(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const token = getBearerToken(request);
    if (token) {
      await revokeSessionByToken(this.db!, token);
    }

    return json({ ok: true });
  }
}
