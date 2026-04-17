import { authMiddleware } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rate-limit';
import type { AccessTier } from '../auth/credentials';

export type IonCapability =
  | 'baseline_chat'
  | 'baseline_retrieval'
  | 'enhanced_ai_internet_backend'
  | 'full_federation_search'
  | 'targeted_ion_sweep'
  | 'data_sovereignty_v1'
  | 'real_time_operations'
  | 'enterprise_controls';

export interface IonGatewayPolicy {
  id: string;
  minimumTier: AccessTier;
  authRequired: boolean;
  rateLimited: boolean;
}

export interface IonGatewayContext {
  requestId: string;
  accessTier: AccessTier;
  authenticated: boolean;
  sessionId: string;
  userId?: string;
  email?: string;
  policy: IonGatewayPolicy;
  capabilities: IonCapability[];
}

interface IonGatewayEnv {
  CACHE?: KVNamespace;
  MEMORY?: KVNamespace;
  ION_DB?: D1Database;
  DB?: D1Database;
}

declare global {
  interface Request {
    ionGatewayContext?: IonGatewayContext;
  }
}

const BASELINE_CAPABILITIES: IonCapability[] = ['baseline_chat', 'baseline_retrieval'];
const PREMIUM_CAPABILITIES: IonCapability[] = [
  ...BASELINE_CAPABILITIES,
  'enhanced_ai_internet_backend',
  'full_federation_search',
  'targeted_ion_sweep',
  'data_sovereignty_v1',
  'real_time_operations'
];
const ENTERPRISE_CAPABILITIES: IonCapability[] = [...PREMIUM_CAPABILITIES, 'enterprise_controls'];

const POLICY_DEFAULT: IonGatewayPolicy = {
  id: 'public-free',
  minimumTier: 'free',
  authRequired: false,
  rateLimited: true,
};

const POLICY_MATCHERS: Array<{ prefix: string; policy: IonGatewayPolicy }> = [
  {
    prefix: '/api/premium',
    policy: {
      id: 'premium-access',
      minimumTier: 'premium',
      authRequired: true,
      rateLimited: true,
    },
  },
  {
    prefix: '/api/enterprise',
    policy: {
      id: 'enterprise-access',
      minimumTier: 'enterprise',
      authRequired: true,
      rateLimited: true,
    },
  },
];

function compareTier(left: AccessTier, right: AccessTier): number {
  const rank: Record<AccessTier, number> = {
    free: 0,
    premium: 1,
    enterprise: 2,
  };

  return rank[left] - rank[right];
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function withGatewayHeaders(response: Response, context: IonGatewayContext): Response {
  const headers = new Headers(response.headers);
  headers.set('X-ION-Gateway', 'active');
  headers.set('X-ION-Request-Id', context.requestId);
  headers.set('X-ION-Access-Tier', context.accessTier);
  headers.set('X-ION-Gateway-Policy', context.policy.id);
  headers.set('X-ION-Authenticated', String(context.authenticated));
  headers.set('X-ION-Capabilities', context.capabilities.join(','));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function buildTierCapabilities(tier: AccessTier): IonCapability[] {
  if (tier === 'enterprise') {
    return [...ENTERPRISE_CAPABILITIES];
  }
  if (tier === 'premium') {
    return [...PREMIUM_CAPABILITIES];
  }
  return [...BASELINE_CAPABILITIES];
}

export function resolveGatewayPolicy(pathname: string): IonGatewayPolicy {
  for (const matcher of POLICY_MATCHERS) {
    if (pathname.startsWith(matcher.prefix)) {
      return matcher.policy;
    }
  }

  return POLICY_DEFAULT;
}

export function serializeGatewayContext(context: IonGatewayContext) {
  return {
    requestId: context.requestId,
    accessTier: context.accessTier,
    authenticated: context.authenticated,
    sessionId: context.sessionId,
    userId: context.userId || null,
    email: context.email || null,
    policy: context.policy,
    capabilities: context.capabilities,
  };
}

export async function applyIonGateway(
  request: Request,
  env: IonGatewayEnv,
  next: (request: Request, context: IonGatewayContext) => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url);
  const policy = resolveGatewayPolicy(url.pathname);
  const authResult = await authMiddleware(request, env);

  if (!authResult.valid || !authResult.context) {
    const rejectedContext: IonGatewayContext = {
      requestId: crypto.randomUUID(),
      accessTier: 'free',
      authenticated: false,
      sessionId: 'invalid-session',
      policy,
      capabilities: buildTierCapabilities('free'),
    };

    return withGatewayHeaders(
      json({
        error: authResult.error || 'Unauthorized',
        code: 'ION_GATEWAY_UNAUTHORIZED',
      }, 401),
      rejectedContext
    );
  }

  const context: IonGatewayContext = {
    requestId: crypto.randomUUID(),
    accessTier: authResult.context.accessTier || 'free',
    authenticated: Boolean(authResult.context.userId),
    sessionId: authResult.context.sessionId,
    userId: authResult.context.userId,
    email: authResult.context.email,
    policy,
    capabilities: buildTierCapabilities(authResult.context.accessTier || 'free'),
  };

  request.authContext = authResult.context;
  request.ionGatewayContext = context;

  if (policy.authRequired && !context.authenticated) {
    return withGatewayHeaders(
      json({
        error: 'Authentication is required for this route.',
        code: 'ION_GATEWAY_AUTH_REQUIRED',
        requiredTier: policy.minimumTier,
      }, 401),
      context
    );
  }

  if (compareTier(context.accessTier, policy.minimumTier) < 0) {
    return withGatewayHeaders(
      json({
        error: `${policy.minimumTier} access is required for this route.`,
        code: 'ION_GATEWAY_TIER_REQUIRED',
        requiredTier: policy.minimumTier,
        currentTier: context.accessTier,
      }, 402),
      context
    );
  }

  const rateLimitStore = env.CACHE || env.MEMORY;
  if (policy.rateLimited && rateLimitStore) {
    const rateLimitedResponse = await checkRateLimit(request, context.sessionId, rateLimitStore);
    if (rateLimitedResponse) {
      return withGatewayHeaders(rateLimitedResponse, context);
    }
  }

  const response = await next(request, context);
  return withGatewayHeaders(response, context);
}