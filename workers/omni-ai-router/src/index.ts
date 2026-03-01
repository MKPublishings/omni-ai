interface Env {
  API_TARGET: string;
  SITE_TARGET: string;
}

function normalizeBaseUrl(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incomingUrl = new URL(request.url);
    const apiTarget = normalizeBaseUrl(env.API_TARGET);
    const siteTarget = normalizeBaseUrl(env.SITE_TARGET);

    const base = incomingUrl.pathname.startsWith("/api") ? apiTarget : siteTarget;
    if (!base) {
      return new Response("Router target is not configured", { status: 503 });
    }

    const targetUrl = `${base}${incomingUrl.pathname}${incomingUrl.search}`;

    const method = request.method.toUpperCase();
    const headers = new Headers(request.headers);
    if (!headers.has("Content-Type") && !["GET", "HEAD"].includes(method)) {
      headers.set("Content-Type", "application/json");
    }

    const init: RequestInit = {
      method,
      headers,
      redirect: "follow"
    };

    if (!["GET", "HEAD"].includes(method)) {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(targetUrl, init);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: upstream.headers
    });
  }
};
