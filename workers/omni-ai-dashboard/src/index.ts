interface Env {
  ORCHESTRATOR_URL: string;
  MEDIA_URL: string;
  IMAGES_URL: string;
  AUDIO_URL: string;
  EMBEDDINGS_URL: string;
  ROUTER_URL: string;
}

type WorkerTarget = {
  name: string;
  baseUrl: string;
};

type ServiceHealth = {
  name: string;
  url: string;
  reachable: boolean;
  ok: boolean;
  status: number | null;
  latency_ms: number | null;
  error: string | null;
};

function normalizeBaseUrl(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildTargets(env: Env): WorkerTarget[] {
  return [
    { name: "orchestrator", baseUrl: normalizeBaseUrl(env.ORCHESTRATOR_URL) },
    { name: "media", baseUrl: normalizeBaseUrl(env.MEDIA_URL) },
    { name: "images", baseUrl: normalizeBaseUrl(env.IMAGES_URL) },
    { name: "audio", baseUrl: normalizeBaseUrl(env.AUDIO_URL) },
    { name: "embeddings", baseUrl: normalizeBaseUrl(env.EMBEDDINGS_URL) },
    { name: "router", baseUrl: normalizeBaseUrl(env.ROUTER_URL) }
  ];
}

async function probeTarget(target: WorkerTarget): Promise<ServiceHealth> {
  if (!target.baseUrl) {
    return {
      name: target.name,
      url: "",
      reachable: false,
      ok: false,
      status: null,
      latency_ms: null,
      error: "missing target URL"
    };
  }

  const started = Date.now();
  try {
    const response = await fetch(target.baseUrl, {
      method: "GET",
      redirect: "follow"
    });

    return {
      name: target.name,
      url: target.baseUrl,
      reachable: true,
      ok: response.ok,
      status: response.status,
      latency_ms: Date.now() - started,
      error: null
    };
  } catch (error: any) {
    return {
      name: target.name,
      url: target.baseUrl,
      reachable: false,
      ok: false,
      status: null,
      latency_ms: Date.now() - started,
      error: String(error?.message || "request failed")
    };
  }
}

function aggregateSummary(services: ServiceHealth[]) {
  const total = services.length;
  const reachable = services.filter((item) => item.reachable).length;
  const unreachable = total - reachable;
  const healthy_http = services.filter((item) => item.ok).length;
  const unhealthy_http = total - healthy_http;
  const latencies = services.map((item) => item.latency_ms).filter((value): value is number => Number.isFinite(value));
  const averageLatency = latencies.length
    ? Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(2))
    : null;

  return {
    total,
    reachable,
    unreachable,
    healthy_http,
    unhealthy_http,
    average_latency_ms: averageLatency
  };
}

async function buildHealthPayload(env: Env) {
  const targets = buildTargets(env);
  const services = await Promise.all(targets.map((target) => probeTarget(target)));
  const summary = aggregateSummary(services);

  return {
    ok: summary.unreachable === 0,
    timestamp: new Date().toISOString(),
    summary,
    services
  };
}

async function buildOverviewPayload(env: Env) {
  const health = await buildHealthPayload(env);
  const services = health.services.map((service) => ({
    name: service.name,
    url: service.url,
    status: service.reachable ? "online" : "offline",
    healthy_http: service.ok,
    http_status: service.status,
    latency_ms: service.latency_ms,
    error: service.error
  }));

  return {
    ok: health.ok,
    generated_at: health.timestamp,
    mesh: {
      total_workers: health.summary.total,
      online_workers: health.summary.reachable,
      offline_workers: health.summary.unreachable,
      healthy_http_workers: health.summary.healthy_http,
      unhealthy_http_workers: health.summary.unhealthy_http,
      average_latency_ms: health.summary.average_latency_ms
    },
    services
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      const payload = await buildHealthPayload(env);
      return Response.json(payload, { status: 200 });
    }

    if (url.pathname === "/overview") {
      const payload = await buildOverviewPayload(env);
      return Response.json(payload, { status: 200 });
    }

    return new Response("Omni AI Dashboard worker online. Endpoints: /health, /overview");
  }
};
