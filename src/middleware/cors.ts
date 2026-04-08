/**
 * @module CORS Middleware
 * @spec: ion-router-v2
 * 
 * CORS header handling for API routes.
 * Automatically handles preflight OPTIONS requests.
 */

export interface CORSOptions {
  allowOrigin?: string;
  allowMethods?: string[];
  allowHeaders?: string[];
  exposeHeaders?: string[];
  maxAge?: number;
}

const DEFAULT_OPTIONS: CORSOptions = {
  allowOrigin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
};

export function corsHeaders(options: CORSOptions = DEFAULT_OPTIONS): HeadersInit {
  return {
    'Access-Control-Allow-Origin': options.allowOrigin || '*',
    'Access-Control-Allow-Methods': (options.allowMethods || []).join(', '),
    'Access-Control-Allow-Headers': (options.allowHeaders || []).join(', '),
    'Access-Control-Expose-Headers': (options.exposeHeaders || []).join(', '),
    'Access-Control-Max-Age': String(options.maxAge || 86400),
  };
}

export function handleCORS(request: Request): Response | null {
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  return null;
}

/**
 * Wrap a response with CORS headers
 */
export function withCORS(response: Response, options?: CORSOptions): Response {
  const cors = corsHeaders(options);
  const headers = new Headers(response.headers);

  // Add CORS headers
  Object.entries(cors).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
