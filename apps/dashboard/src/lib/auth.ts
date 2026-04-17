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

const TOKEN_KEY = 'ion_token';
const USER_KEY = 'ion_user';

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
  if (typeof window === 'undefined') {
    return null;
  }
  return safeJsonParse<AuthUser>(window.localStorage.getItem(USER_KEY));
}

export function storeAuthSession(payload: AuthResponse): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, payload.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
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
  return fetch(input, { ...init, headers, credentials: init?.credentials || 'include' });
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

export async function verifyEmailToken(token: string): Promise<{ ok: boolean; user?: AuthUser }> {
  const response = await fetch(getApiUrl('/api/auth/verify-email'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Email verification failed');
  }

  return payload as { ok: boolean; user?: AuthUser };
}

export async function resendVerification(identifier: string): Promise<{ verificationUrl?: string | null; alreadyVerified?: boolean; verificationDelivery?: string; verificationEmailSent?: boolean; verificationEmailError?: string }> {
  const response = await fetch(getApiUrl('/api/auth/resend-verification'), {
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
