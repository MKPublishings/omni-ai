import {
  activateProvisionedWorkspaces,
  parseProvisionWorkspaceInput,
  provisionUserWorkspace,
} from '../onboarding/provisioning';
import {
  AuthConflictError,
  consumeEmailVerificationToken,
  createEmailVerification,
  createSession,
  createSessionToken,
  createTrustedUser,
  createUser,
  findUserByEmail,
  findUserByIdentifier,
  findUserById,
  getSessionByToken,
  getEffectiveAccessTier,
  markUserEmailVerified,
  pruneExpiredSessions,
  revokeSessionByToken,
  touchSession,
  updateUserProfile,
  validateEmail,
  validatePassword,
  validateUsername,
  verifyPassword,
} from '../auth/credentials';
import { sendVerificationEmail, type VerificationDelivery } from '../services/email';

type AuthVerificationContext = 'signup' | 'login' | 'resend';

type AuthWorkerEnv = {
  APP_BASE_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_TRANSPORT?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  MAILCHANNELS_API_URL?: string;
  AUTH0_DOMAIN?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

type Auth0UserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
};

type GoogleOauthState = {
  nonce: string;
  next?: string;
  callbackUrl?: string;
  provider: 'google';
};

const GOOGLE_OAUTH_COOKIE = 'ion_google_oauth_state';
const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'].join(' ');
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const DEFAULT_AUTH0_DOMAIN = 'ion-ai.us.auth0.com';

type SignupOnboardingPayload = {
  formation?: unknown;
  context?: unknown;
  source?: unknown;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeState(state: GoogleOauthState): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(state)));
}

function decodeState(rawState: string): GoogleOauthState | null {
  try {
    const normalized = rawState.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<GoogleOauthState>;

    if (!parsed || parsed.provider !== 'google' || typeof parsed.nonce !== 'string') {
      return null;
    }

    return {
      provider: 'google',
      nonce: parsed.nonce,
      next: typeof parsed.next === 'string' ? parsed.next : undefined,
      callbackUrl: typeof parsed.callbackUrl === 'string' ? parsed.callbackUrl : undefined,
    };
  } catch {
    return null;
  }
}

function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie') || request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string, path = '/'): string {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Lax; Secure`;
}

function buildOauthCookie(name: string, value: string, path = '/', maxAgeSeconds = 600): string {
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax; Secure`;
}

function redirect(location: string, init?: { headers?: HeadersInit; status?: number }): Response {
  const headers = new Headers(init?.headers);
  headers.set('Location', location);
  return new Response(null, {
    status: init?.status || 302,
    headers,
  });
}

function buildGoogleRedirectUri(request: Request): string {
  const currentUrl = new URL(request.url);
  return `${currentUrl.origin}/api/auth/google/callback`;
}

function buildSocialCallbackRedirect(targetUrl: string, payload: Record<string, unknown>): string {
  const target = new URL(targetUrl);
  const hashParams = new URLSearchParams(target.hash.replace(/^#/, ''));
  hashParams.set('payload', encodeURIComponent(JSON.stringify(payload)));
  target.hash = hashParams.toString();
  return target.toString();
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
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

function getAuthRequestId(request: Request): string {
  const cfRay = request.headers.get('cf-ray') || request.headers.get('CF-Ray');
  if (cfRay) {
    return cfRay;
  }

  return crypto.randomUUID();
}

function maskEmail(value: string): string {
  const normalized = String(value || '').trim().toLowerCase();
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0) {
    return normalized ? `${normalized.slice(0, 2)}***` : 'unknown';
  }

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const maskedLocal = local.length <= 2
    ? `${local.charAt(0) || '*'}***`
    : `${local.slice(0, 2)}***`;

  return `${maskedLocal}@${domain}`;
}

function maskIdentifier(value: string): string {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return 'unknown';
  }
  if (normalized.includes('@')) {
    return maskEmail(normalized);
  }

  return normalized.length <= 3
    ? `${normalized.charAt(0)}***`
    : `${normalized.slice(0, 3)}***`;
}

function sanitizeErrorMessage(value: unknown, maxLength = 320): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1))}...`
    : normalized;
}

function buildUsernameSeed(...values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) {
      return normalized;
    }
  }

  return 'ion-operator';
}

function logAuthDelivery(event: string, data: Record<string, unknown>, level: 'log' | 'error' = 'log') {
  const payload = {
    event,
    data,
    timestamp: Date.now(),
  };

  if (level === 'error') {
    console.error('[ION AUTH]', JSON.stringify(payload));
    return;
  }

  console.log('[ION AUTH]', JSON.stringify(payload));
}

export class AuthWorker {
  constructor(private db?: D1Database, private env?: AuthWorkerEnv) {}

  private buildVerificationUrl(request: Request, token: string): string {
    const origin = String(this.env?.APP_BASE_URL || '').trim() || new URL(request.url).origin;
    return `${origin.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
  }

  private getGoogleOauthConfig() {
    const clientId = String(this.env?.GOOGLE_OAUTH_CLIENT_ID || '').trim();
    const clientSecret = String(this.env?.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
    if (!clientId || !clientSecret) {
      return null;
    }

    return { clientId, clientSecret };
  }

  private getAuth0Domain(): string {
    return String(this.env?.AUTH0_DOMAIN || DEFAULT_AUTH0_DOMAIN)
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');
  }

  private async getAuth0UserInfo(accessToken: string): Promise<Auth0UserInfo | null> {
    const domain = this.getAuth0Domain();
    if (!domain) {
      return null;
    }

    const response = await fetch(`https://${domain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return parseJsonSafe<Auth0UserInfo>(response);
  }

  private buildGoogleCallbackUrl(request: Request, state: GoogleOauthState): string {
    const fallbackBase = String(this.env?.APP_BASE_URL || '').trim() || new URL(request.url).origin;
    try {
      const resolved = new URL(state.callbackUrl || '/auth/callback', fallbackBase);
      if (!resolved.searchParams.has('provider')) {
        resolved.searchParams.set('provider', 'google');
      }
      if (state.next && !resolved.searchParams.has('next')) {
        resolved.searchParams.set('next', state.next);
      }
      return resolved.toString();
    } catch {
      const fallback = new URL('/auth/callback', fallbackBase);
      fallback.searchParams.set('provider', 'google');
      if (state.next) {
        fallback.searchParams.set('next', state.next);
      }
      return fallback.toString();
    }
  }

  async startGoogleOAuth(request: Request): Promise<Response> {
    const config = this.getGoogleOauthConfig();
    if (!config) {
      return json({
        error: 'Google OAuth is not configured.',
        code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
      }, 503);
    }

    const requestUrl = new URL(request.url);
    const nonce = createSessionToken();
    const state: GoogleOauthState = {
      provider: 'google',
      nonce,
      next: requestUrl.searchParams.get('next') || '/workspace',
      callbackUrl: requestUrl.searchParams.get('callbackUrl') || requestUrl.searchParams.get('callback_url') || undefined,
    };

    const googleUrl = new URL(GOOGLE_AUTH_URL);
    googleUrl.searchParams.set('client_id', config.clientId);
    googleUrl.searchParams.set('redirect_uri', buildGoogleRedirectUri(request));
    googleUrl.searchParams.set('response_type', 'code');
    googleUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES);
    googleUrl.searchParams.set('state', encodeState(state));
    googleUrl.searchParams.set('access_type', 'offline');
    googleUrl.searchParams.set('prompt', 'consent');

    return redirect(googleUrl.toString(), {
      headers: {
        'Set-Cookie': buildOauthCookie(GOOGLE_OAUTH_COOKIE, nonce, '/api/auth/google/callback'),
      },
    });
  }

  async completeGoogleOAuth(request: Request): Promise<Response> {
    const config = this.getGoogleOauthConfig();
    if (!config) {
      return json({
        error: 'Google OAuth is not configured.',
        code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
      }, 503);
    }

    const requestUrl = new URL(request.url);
    const rawState = requestUrl.searchParams.get('state') || '';
    const state = decodeState(rawState);
    const callbackTarget = this.buildGoogleCallbackUrl(request, state || {
      provider: 'google',
      nonce: '',
      next: requestUrl.searchParams.get('next') || '/workspace',
    });

    const finishWithError = (message: string): Response => redirect(`${callbackTarget}${callbackTarget.includes('#') ? '&' : '#'}error=${encodeURIComponent(message)}`, {
      headers: {
        'Set-Cookie': clearCookie(GOOGLE_OAUTH_COOKIE, '/api/auth/google/callback'),
      },
    });

    if (!state) {
      return finishWithError('Invalid Google OAuth state.');
    }

    const cookieNonce = getCookieValue(request, GOOGLE_OAUTH_COOKIE);
    if (!cookieNonce || cookieNonce !== state.nonce) {
      return finishWithError('Google OAuth state check failed.');
    }

    const code = requestUrl.searchParams.get('code');
    const providerError = requestUrl.searchParams.get('error');
    if (providerError) {
      return finishWithError(`Google returned an error: ${providerError}`);
    }

    if (!code) {
      return finishWithError('Google did not return an authorization code.');
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: buildGoogleRedirectUri(request),
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenPayload = await parseJsonSafe<GoogleTokenResponse>(tokenResponse);
    if (!tokenResponse.ok || !tokenPayload?.access_token) {
      return finishWithError(tokenPayload?.error_description || tokenPayload?.error || 'Google token exchange failed.');
    }

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    });
    const profile = await parseJsonSafe<GoogleUserInfo>(profileResponse);
    if (!profileResponse.ok || !profile?.email) {
      return finishWithError('Google profile lookup failed.');
    }

    if (profile.email_verified !== true) {
      return finishWithError('Google account email is not verified.');
    }

    const email = String(profile.email || '').trim().toLowerCase();
    const displayName = String(profile.name || profile.given_name || email.split('@')[0] || 'ION Operator').trim();
    const usernameSeed = String(profile.given_name || profile.name || email.split('@')[0] || 'google-user').trim();

    let userRecord = await findUserByEmail(this.db!, email);
    let user = userRecord
      ? {
          id: userRecord.id,
          username: userRecord.username,
          email: userRecord.email,
          displayName: userRecord.display_name,
          role: userRecord.role,
          emailVerified: userRecord.email_verified === 1,
        }
      : null;

    if (!user) {
      user = await createTrustedUser(this.db!, {
        email,
        displayName,
        username: usernameSeed,
        emailVerified: true,
      });
    } else if (!user.emailVerified) {
      await markUserEmailVerified(this.db!, user.id);
      user.emailVerified = true;
    }

    await pruneExpiredSessions(this.db!);
    const { token, session } = await createSession(this.db!, user.id, request);
    const accessTier = await getEffectiveAccessTier(this.db!, user.id, user.role);
    const redirectUrl = buildSocialCallbackRedirect(callbackTarget, {
      token,
      sessionId: session.id,
      expiresAt: session.expires_at,
      accessTier,
      user,
      provider: 'google',
    });

    return redirect(redirectUrl, {
      headers: {
        'Set-Cookie': clearCookie(GOOGLE_OAUTH_COOKIE, '/api/auth/google/callback'),
      },
    });
  }

  async createAuth0Session(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const requestId = getAuthRequestId(request);
    const body = getRequestBody(await request.json().catch(() => null));
    const accessToken = String(body?.accessToken || '').trim();

    if (!accessToken) {
      return json({ error: 'Auth0 access token is required.' }, 400);
    }

    const profile = await this.getAuth0UserInfo(accessToken);
    if (!profile?.email) {
      logAuthDelivery('auth0_session_profile_lookup_failed', {
        requestId,
      }, 'error');
      return json({ error: 'Auth0 profile lookup failed.' }, 401);
    }

    if (profile.email_verified !== true) {
      return json({ error: 'Auth0 account email is not verified.' }, 403);
    }

    const email = String(profile.email || '').trim().toLowerCase();
    const displayName = String(profile.name || profile.nickname || email.split('@')[0] || 'ION Operator').trim();
    const usernameSeed = buildUsernameSeed(profile.nickname, profile.name, email.split('@')[0], profile.sub);

    let userRecord = await findUserByEmail(this.db!, email);
    let user = userRecord
      ? {
          id: userRecord.id,
          username: userRecord.username,
          email: userRecord.email,
          displayName: userRecord.display_name,
          role: userRecord.role,
          emailVerified: userRecord.email_verified === 1,
        }
      : null;

    if (!user) {
      user = await createTrustedUser(this.db!, {
        email,
        displayName,
        username: usernameSeed,
        emailVerified: true,
      });
      logAuthDelivery('auth0_session_user_created', {
        requestId,
        userId: user.id,
        email: maskEmail(user.email),
      });
    } else if (!user.emailVerified) {
      await markUserEmailVerified(this.db!, user.id);
      user.emailVerified = true;
    }

    await pruneExpiredSessions(this.db!);
    const { token, session } = await createSession(this.db!, user.id, request);
    const accessTier = await getEffectiveAccessTier(this.db!, user.id, user.role);

    return json({
      token,
      sessionId: session.id,
      expiresAt: session.expires_at,
      accessTier,
      user,
    });
  }

  private async issueVerification(
    request: Request,
    user: { id: string; username: string; email: string; displayName: string; role: string; emailVerified: boolean; },
    context: AuthVerificationContext,
    requestId: string,
  ) {
    const verification = await createEmailVerification(this.db!, user);
    const verificationUrl = this.buildVerificationUrl(request, verification.token);
    logAuthDelivery('verification_token_issued', {
      requestId,
      context,
      userId: user.id,
      email: maskEmail(user.email),
      expiresAt: verification.record.expires_at,
      appBaseUrl: String(this.env?.APP_BASE_URL || '').trim() || new URL(request.url).origin,
    });

    const mailResult = await sendVerificationEmail(this.env || {}, {
      to: user.email,
      displayName: user.displayName,
      verificationUrl,
    });

    logAuthDelivery(mailResult.delivered ? 'verification_email_delivered' : 'verification_email_failed', {
      requestId,
      context,
      userId: user.id,
      email: maskEmail(user.email),
      delivery: mailResult.delivery,
      provider: mailResult.provider,
      attemptedProvider: mailResult.attemptedProvider || null,
      failureStage: mailResult.failureStage || null,
      statusCode: mailResult.statusCode || null,
      responseSnippet: sanitizeErrorMessage(mailResult.responseSnippet || ''),
      error: sanitizeErrorMessage(mailResult.error || ''),
      transportConfigured: String(this.env?.EMAIL_TRANSPORT || '').trim().toLowerCase() || '(auto)',
      hasResendApiKey: Boolean(String(this.env?.RESEND_API_KEY || '').trim()),
      hasEmailFrom: Boolean(String(this.env?.EMAIL_FROM || '').trim()),
      mailchannelsApiUrl: String(this.env?.MAILCHANNELS_API_URL || '').trim() || 'https://api.mailchannels.net/tx/v1/send',
    }, mailResult.delivered ? 'log' : 'error');

    return {
      verification,
      verificationUrl,
      verificationDelivery: mailResult.delivery as VerificationDelivery,
      verificationProvider: mailResult.provider,
      verificationEmailSent: mailResult.delivered,
      verificationEmailError: mailResult.error,
    };
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

    const requestId = getAuthRequestId(request);

    const body = getRequestBody(await request.json().catch(() => null));
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const displayName = String(body?.displayName || '').trim();
    const username = String(body?.username || '').trim();
    const onboardingPayload = body?.onboarding as SignupOnboardingPayload | undefined;

    if (onboardingPayload) {
      const parsedProvisioning = parseProvisionWorkspaceInput(onboardingPayload);
      if (!parsedProvisioning.ok) {
        return json({ error: parsedProvisioning.error }, 400);
      }
    }

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
      logAuthDelivery('signup_duplicate_email', {
        requestId,
        email: maskEmail(email),
      });
      return json({ error: 'An account with that email already exists.' }, 409);
    }

    const user = await createUser(this.db!, { email, password, displayName, username });
    logAuthDelivery('signup_user_created', {
      requestId,
      userId: user.id,
      email: maskEmail(user.email),
      username: user.username,
    });

    let workspaceProvisioned = false;
    let workspaceProvisionError: string | null = null;

    if (onboardingPayload) {
      const parsedProvisioning = parseProvisionWorkspaceInput(onboardingPayload);
      if (parsedProvisioning.ok) {
        try {
          await provisionUserWorkspace(this.db!, user.id, parsedProvisioning.data, {
            status: 'pending-verification',
            source: 'signup-onboarding',
          });
          workspaceProvisioned = true;
        } catch (error) {
          workspaceProvisionError = error instanceof Error ? error.message : 'Workspace provisioning could not be persisted.';
          logAuthDelivery('signup_workspace_provision_failed', {
            requestId,
            userId: user.id,
            email: maskEmail(user.email),
            error: sanitizeErrorMessage(workspaceProvisionError),
          }, 'error');
        }
      }
    }

    const delivery = await this.issueVerification(request, user, 'signup', requestId);

    return json({
      verificationRequired: true,
      verificationUrl: delivery.verificationEmailSent ? null : delivery.verificationUrl,
      verificationDelivery: delivery.verificationDelivery,
      verificationProvider: delivery.verificationProvider,
      verificationEmailSent: delivery.verificationEmailSent,
      verificationEmailError: delivery.verificationEmailError,
      workspaceProvisioned,
      workspaceProvisionError,
      user,
    }, 201);
  }

  async login(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const requestId = getAuthRequestId(request);

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
      logAuthDelivery('login_verification_required', {
        requestId,
        userId: userRecord.id,
        identifier: maskIdentifier(identifier),
        email: maskEmail(userRecord.email),
      });

      const verification = user ? await this.issueVerification(request, {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        emailVerified: false,
      }, 'login', requestId) : null;

      return json({
        error: 'Email verification is required before signing in.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        verificationUrl: verification && !verification.verificationEmailSent ? verification.verificationUrl : null,
        verificationDelivery: verification?.verificationDelivery || 'manual-link',
        verificationProvider: verification?.verificationProvider || 'manual-link',
        verificationEmailSent: verification?.verificationEmailSent || false,
        verificationEmailError: verification?.verificationEmailError,
      }, 403);
    }

    await pruneExpiredSessions(this.db!);
    const { token, session } = await createSession(this.db!, userRecord.id, request);
    const accessTier = await getEffectiveAccessTier(this.db!, userRecord.id, userRecord.role);

    return json({
      token,
      sessionId: session.id,
      expiresAt: session.expires_at,
      accessTier,
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
    return json({
      user: auth.user,
      sessionId: auth.session.id,
      expiresAt: auth.session.expires_at,
      accessTier: auth.accessTier,
    });
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
      return json({ error: 'Verification token is required.', code: 'EMAIL_VERIFICATION_MISSING_TOKEN' }, 400);
    }

    const result = await consumeEmailVerificationToken(this.db!, token);
    if (result.status === 'expired') {
      return json({ error: 'This verification link has expired. Request a fresh verification email to continue.', code: 'EMAIL_VERIFICATION_EXPIRED' }, 410);
    }

    if (result.status === 'used') {
      return json({ error: 'This verification link has already been used. Sign in to continue.', code: 'EMAIL_VERIFICATION_USED' }, 409);
    }

    if (result.status === 'not_found' || !result.user) {
      return json({ error: 'This verification link is invalid.', code: 'EMAIL_VERIFICATION_INVALID' }, 400);
    }

    await activateProvisionedWorkspaces(this.db!, result.user.id);

    return json({ ok: true, user: result.user, verified: true, code: 'EMAIL_VERIFICATION_VERIFIED' });
  }

  async resendVerification(request: Request): Promise<Response> {
    const dbError = this.ensureDb();
    if (dbError) {
      return dbError;
    }

    const requestId = getAuthRequestId(request);

    const body = getRequestBody(await request.json().catch(() => null));
    const identifier = String(body?.identifier || body?.email || '').trim();

    if (!identifier) {
      return json({ error: 'Email or username is required.' }, 400);
    }

    const userRecord = await findUserByIdentifier(this.db!, identifier);
    if (!userRecord) {
      logAuthDelivery('resend_verification_user_not_found', {
        requestId,
        identifier: maskIdentifier(identifier),
      });
      return json({ error: 'No account was found for that identifier.' }, 404);
    }

    if (userRecord.email_verified === 1) {
      logAuthDelivery('resend_verification_already_verified', {
        requestId,
        userId: userRecord.id,
        email: maskEmail(userRecord.email),
      });
      return json({ ok: true, alreadyVerified: true });
    }

    logAuthDelivery('resend_verification_requested', {
      requestId,
      userId: userRecord.id,
      identifier: maskIdentifier(identifier),
      email: maskEmail(userRecord.email),
    });

    const verification = await this.issueVerification(request, {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      displayName: userRecord.display_name,
      role: userRecord.role,
      emailVerified: false,
    }, 'resend', requestId);

    return json({
      ok: true,
      verificationRequired: true,
      verificationUrl: verification.verificationEmailSent ? null : verification.verificationUrl,
      verificationDelivery: verification.verificationDelivery,
      verificationProvider: verification.verificationProvider,
      verificationEmailSent: verification.verificationEmailSent,
      verificationEmailError: verification.verificationEmailError,
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
