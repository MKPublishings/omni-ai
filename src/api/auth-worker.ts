import {
  AuthConflictError,
  consumeEmailVerificationToken,
  createEmailVerification,
  createSession,
  createUser,
  findUserByEmail,
  findUserByIdentifier,
  findUserById,
  getSessionByToken,
  pruneExpiredSessions,
  revokeSessionByToken,
  touchSession,
  updateUserProfile,
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

  private buildVerificationUrl(request: Request, token: string): string {
    const url = new URL(request.url);
    return `${url.origin}/verify-email?token=${encodeURIComponent(token)}`;
  }

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
    const verification = await createEmailVerification(this.db!, user);

    return json({
      verificationRequired: true,
      verificationUrl: this.buildVerificationUrl(request, verification.token),
      verificationDelivery: 'manual-link',
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

    if (userRecord.email_verified !== 1) {
      const user = await findUserById(this.db!, userRecord.id);
      const verification = user ? await createEmailVerification(this.db!, {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        emailVerified: false,
      }) : null;

      return json({
        error: 'Email verification is required before signing in.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        verificationUrl: verification ? this.buildVerificationUrl(request, verification.token) : null,
      }, 403);
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

  async verifyEmail(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const url = new URL(request.url);
    const body = getRequestBody(await request.json().catch(() => null));
    const token = String(body?.token || url.searchParams.get('token') || '').trim();

    if (!token) {
      return json({ error: 'Verification token is required.' }, 400);
    }

    const user = await consumeEmailVerificationToken(this.db!, token);
    if (!user) {
      return json({ error: 'Verification token is invalid or expired.' }, 400);
    }

    return json({ ok: true, user, verified: true });
  }

  async resendVerification(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const body = getRequestBody(await request.json().catch(() => null));
    const identifier = String(body?.identifier || body?.email || '').trim();

    if (!identifier) {
      return json({ error: 'Email or username is required.' }, 400);
    }

    const userRecord = await findUserByIdentifier(this.db!, identifier);
    if (!userRecord) {
      return json({ error: 'No account was found for that identifier.' }, 404);
    }

    if (userRecord.email_verified === 1) {
      return json({ ok: true, alreadyVerified: true });
    }

    const verification = await createEmailVerification(this.db!, {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      displayName: userRecord.display_name,
      role: userRecord.role,
      emailVerified: false,
    });

    return json({
      ok: true,
      verificationRequired: true,
      verificationUrl: this.buildVerificationUrl(request, verification.token),
      verificationDelivery: 'manual-link',
    });
  }

  async updateProfile(request: Request): Promise<Response> {
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

    const body = getRequestBody(await request.json().catch(() => null));

    try {
      const user = await updateUserProfile(this.db!, auth.user.id, {
        displayName: body?.displayName ? String(body.displayName) : undefined,
        username: body?.username ? String(body.username) : undefined,
      });

      return json({ user });
    } catch (error) {
      if (error instanceof AuthConflictError) {
        return json({ error: error.message, code: error.code }, 409);
      }

      return json({ error: error instanceof Error ? error.message : 'Profile update failed.' }, 400);
    }
  }
}
