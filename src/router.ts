/**
 * @module Router
 * @spec: ion-router-v2
 * 
 * Centralized route dispatcher that maps URL patterns to worker handlers.
 * Supports path parameters, method matching, and middleware chaining.
 * 
 * Usage:
 *   const router = new Router();
 *   router.add('GET', '/api/memory/:id', memoryHandler);
 *   const response = await router.handle(request, env, ctx);
 */

export interface RouteParams {
  [key: string]: string;
}

export type RouteHandler = (
  request: Request,
  env: any,
  ctx: ExecutionContext,
  params: RouteParams
) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  /**
   * Register a route with method, path pattern, and handler.
   * Path patterns can include `:paramName` for capturing path segments.
   * Example: '/api/memory/:id' will match '/api/memory/abc123'
   */
  add(method: string, path: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    const patternStr = path.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^${patternStr}/?$`),
      paramNames,
      handler,
    });
  }

  /**
   * Match a request to a registered route.
   * Returns the handler and extracted path parameters, or null if no match.
   */
  match(request: Request): { handler: RouteHandler; params: RouteParams } | null {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname;

    for (const route of this.routes) {
      // Check method (allow 'ALL' wildcard)
      if (route.method !== method && route.method !== 'ALL') continue;

      // Check pattern
      const matchResult = pathname.match(route.pattern);
      if (!matchResult) continue;

      // Extract parameters
      const params: RouteParams = {};
      route.paramNames.forEach((name, i) => {
        params[name] = matchResult[i + 1];
      });

      return { handler: route.handler, params };
    }

    return null;
  }

  /**
   * Handle an incoming request through the router.
   * Dispatches to the matched route handler or returns 404.
   */
  async handle(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const matched = this.match(request);
    if (!matched) {
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    try {
      return await matched.handler(request, env, ctx, matched.params);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      console.error('[Router] Handler error:', message, error);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
