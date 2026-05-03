export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  token: string;
  sessionId: string;
  expiresAt: string;
  accessTier?: string;
  user: AuthUser;
}

export interface VerifyEmailResponse {
  ok: boolean;
  user?: AuthUser;
  verified?: boolean;
  code?: string;
  error?: string;
  token?: string;
  sessionId?: string;
  expiresAt?: string;
  accessTier?: string;
}

const TOKEN_KEY = 'ion_token';
const USER_KEY = 'ion_user';

type StorageScopeSource = string | Pick<AuthUser, 'id' | 'email' | 'username'> | null | undefined;

function normalizeScopeSegment(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readStoredUserFromLocalStorage(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return safeJsonParse<AuthUser>(window.localStorage.getItem(USER_KEY));
}

function resolveScopeSource(input?: StorageScopeSource): string {
  if (typeof input === 'string') {
    const normalized = normalizeScopeSegment(input);
    return normalized || 'anonymous';
  }

  if (input?.id) {
    return `user-${normalizeScopeSegment(input.id)}`;
  }

  if (input?.email) {
    return `email-${normalizeScopeSegment(input.email)}`;
  }

  if (input?.username) {
    return `username-${normalizeScopeSegment(input.username)}`;
  }

  const storedUser = readStoredUserFromLocalStorage();
  if (storedUser?.id) {
    return `user-${normalizeScopeSegment(storedUser.id)}`;
  }

  return 'anonymous';
}

function migrateScopedLocalStorageValue(baseKey: string, targetScope: StorageScopeSource, sourceScopes: StorageScopeSource[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  const targetKey = buildUserScopedStorageKey(baseKey, targetScope);
  if (window.localStorage.getItem(targetKey)) {
    return;
  }

  const candidateKeys = [
    baseKey,
    ...sourceScopes.map((scope) => buildUserScopedStorageKey(baseKey, scope)),
  ];

  for (const candidateKey of candidateKeys) {
    const value = window.localStorage.getItem(candidateKey);
    if (!value) {
      continue;
    }

    window.localStorage.setItem(targetKey, value);
    if (candidateKey === baseKey) {
      window.localStorage.removeItem(candidateKey);
    }
    return;
  }
}

function migrateAuthenticatedLocalStorage(user: AuthUser): void {
  if (typeof window === 'undefined') {
    return;
  }

  const sourceScopes: StorageScopeSource[] = [
    user.email,
    user.username,
    'anonymous',
  ];

  migrateScopedLocalStorageValue('ion-dashboard-theme', user, sourceScopes);
  migrateScopedLocalStorageValue('ionirix:onboarding:draft', user, sourceScopes);
  migrateScopedLocalStorageValue('ionirix:onboarding:formation', user, sourceScopes);
}

function buildAuthCookie(token: string, expiresAt?: string): string {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  const expires = expiresAt ? `; Expires=${new Date(expiresAt).toUTCString()}` : '';
  return `${TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${expires}${secure}`;
}

function writeAuthCookie(token: string, expiresAt?: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = buildAuthCookie(token, expiresAt);
}

function clearAuthCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${TOKEN_KEY}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const configuredBase = process.env.NEXT_PUBLIC_ION_API_URL?.trim();

  if (!configuredBase) {
    return normalizedPath;
  }

  return `${configuredBase.replace(/\/+$/, '')}${normalizedPath}`;
}

function resolveSameOriginFallback(input: RequestInfo | URL): string | null {
  const configuredBase = process.env.NEXT_PUBLIC_ION_API_URL?.trim()
  if (!configuredBase) {
    return null
  }

  if (typeof input !== 'string' && !(input instanceof URL)) {
    return null
  }

  try {
    const configuredUrl = new URL(configuredBase)
    const targetUrl = input instanceof URL
      ? input
      : new URL(input, typeof window !== 'undefined' ? window.location.origin : configuredUrl.origin)

    if (targetUrl.origin !== configuredUrl.origin || !targetUrl.pathname.startsWith('/api/')) {
      return null
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
  } catch {
    return null
  }
}

async function fetchWithApiFallback(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (error) {
    const fallbackInput = resolveSameOriginFallback(input)
    if (!fallbackInput) {
      throw error
    }

    return fetch(fallbackInput, init)
  }
}

export function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  return fetchWithApiFallback(getApiUrl(path), init)
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  return readStoredUserFromLocalStorage();
}

export function buildUserScopedStorageKey(baseKey: string, scopeSource?: StorageScopeSource): string {
  return `${baseKey}:${resolveScopeSource(scopeSource)}`;
}

export function storeAuthSession(payload: AuthResponse): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, payload.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  migrateAuthenticatedLocalStorage(payload.user);
  writeAuthCookie(payload.token, payload.expiresAt);
}

export function storeUserProfile(user: AuthUser): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  clearAuthCookie();
}

export async function authorizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetchWithApiFallback(input, { ...init, headers, credentials: init?.credentials || 'include' });
}

export async function updateProfile(input: { displayName: string; username: string }): Promise<AuthUser> {
  const response = await authorizedFetch(getApiUrl('/api/auth/profile'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Profile update failed');
  }

  if (payload.user) {
    storeUserProfile(payload.user as AuthUser);
  }

  return payload.user as AuthUser;
}

export async function verifyEmailToken(token: string): Promise<VerifyEmailResponse> {
  const response = await fetchApi('/api/auth/verify-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    ...(payload as Record<string, unknown>),
  } as VerifyEmailResponse;
}

export async function resendVerification(identifier: string): Promise<{ verificationUrl?: string | null; alreadyVerified?: boolean; verificationDelivery?: string; verificationEmailSent?: boolean; verificationEmailError?: string }> {
  const response = await fetchApi('/api/auth/resend-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Could not resend verification');
  }

  return payload as { verificationUrl?: string | null; alreadyVerified?: boolean; verificationDelivery?: string; verificationEmailSent?: boolean; verificationEmailError?: string };
}
