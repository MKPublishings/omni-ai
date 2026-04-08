/**
 * @module Auth Middleware
 * @spec: ion-router-v2
 * 
 * Session validation middleware.
 * Extracts session ID from cookie or Authorization header.
 * Attaches sessionId and mode to the request object.
 */

export interface AuthContext {
  sessionId: string;
  mode?: string;
  isAdmin?: boolean;
}

declare global {
  interface Request {
    authContext?: AuthContext;
  }
}

export async function authMiddleware(
  request: Request,
  env: any
): Promise<{ valid: boolean; context?: AuthContext; error?: string }> {
  try {
    // Get session ID from Authorization header or cookie
    const authHeader = request.headers.get('Authorization');
    const cookieHeader = request.headers.get('Cookie');

    let sessionId: string | null = null;

    // Try Authorization header (Bearer token)
    if (authHeader?.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7);
    }

    // Try cookie: session=...
    if (!sessionId && cookieHeader) {
      const sessionMatch = cookieHeader.match(/session=([^;]+)/);
      if (sessionMatch) {
        sessionId = sessionMatch[1];
      }
    }

    // Generate temporary session if needed (for public endpoints)
    if (!sessionId) {
      sessionId = `session:${crypto.randomUUID()}`;
    }

    // Look up session metadata from SESSION KV (optional enrichment)
    const SESSION = env.SESSION as KVNamespace | undefined;
    let mode = 'auto';
    let isAdmin = false;

    if (SESSION) {
      const sessionData = await SESSION.get(`session:${sessionId}`, 'json');
      if (sessionData && typeof sessionData === 'object') {
        mode = (sessionData as any).mode || 'auto';
        isAdmin = (sessionData as any).isAdmin === true;
      }
    }

    return {
      valid: true,
      context: { sessionId, mode, isAdmin },
    };
  } catch (error: unknown) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Auth error',
    };
  }
}

/**
 * Check if session has admin privileges.
 * Admin check: either explicitly set in SESSION KV or via ION_ADMIN_KEY env var match.
 */
export async function requireAdmin(
  request: Request,
  env: any
): Promise<boolean> {
  const auth = await authMiddleware(request, env);
  if (!auth.valid || !auth.context) return false;

  if (auth.context.isAdmin) return true;

  // Check admin key header match
  const adminKey = env.ION_ADMIN_KEY;
  if (adminKey) {
    const providedKey = request.headers.get('X-Admin-Key');
    return providedKey === adminKey;
  }

  return false;
}
