import assert from "node:assert/strict";
import test from "node:test";
import worker from "../../index.ts";

class MemoryNamespace {
  store = new Map<string, string>();

  async get(key: string, type?: string): Promise<any> {
    const value = this.store.get(key);
    if (value === undefined) return null;
    if (type === "json") return JSON.parse(value);
    return value;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

function createExecutionContext(): { waitUntil: (promise: Promise<unknown>) => void; passThroughOnException: () => void } {
  return {
    waitUntil(_promise: Promise<unknown>) {
      void _promise;
    },
    passThroughOnException() {
      return;
    }
  };
}

function extractFirstSseEvent(text: string): Record<string, unknown> {
  const match = String(text || "").match(/^data:\s*(\{[\s\S]*?\})\s*$/m);
  assert.ok(match, "expected at least one SSE JSON data event");
  return JSON.parse(match[1] || "{}");
}

test("worker /api/ION infers simulation mode from auto prompts end to end", async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  const env = {
    AI: {
      run: async (_model: string, _input: unknown) => ({ response: "Auto simulation rendered into chat." })
    },
    MEMORY: memory as any,
    MIND: mind as any,
    ASSETS: {
      fetch: async () => new Response("not-found", { status: 404 })
    },
    MODEL_ION: "primary-model",
    MODEL_SIMULATION: "simulation-model"
  } as any;

  const request = new Request("https://example.test/api/ION", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ION-session-id": "worker-auto-sim"
    },
    body: JSON.stringify({
      mode: "auto",
      fastMode: true,
      messages: [
        {
          role: "user",
          content: "Play out a resilience stress test over 5 steps and summarize the system-state transitions."
        }
      ]
    })
  });

  const response = await worker.fetch(request, env, createExecutionContext() as any);
  const sseText = await response.text();
  const firstEvent = extractFirstSseEvent(sseText);
  const simulation = firstEvent.simulation as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/event-stream");
  assert.equal(response.headers.get("X-ION-Route-Reason"), "auto-route:simulation");
  assert.equal(response.headers.get("X-ION-Orchestrator-Route"), "simulation");
  assert.equal(response.headers.get("X-ION-Simulation-Status"), "active");
  assert.ok(String(response.headers.get("X-ION-Simulation-Id") || "").startsWith("sim_worker-auto-sim_"));
  assert.equal(firstEvent.content, "Auto simulation rendered into chat.");
  assert.ok(simulation, "expected simulation payload in SSE event");
  assert.equal(simulation.status, "active");
  assert.equal(simulation.targetSteps, 5);
  assert.equal(simulation.stepsExecuted, 3);
  assert.match(String(simulation.chatReport || ""), /Progress: 60% \(3\/5 steps\)/);
  assert.equal(typeof simulation.export, "object");
});

test("worker /api/ION returns simulation report when native streaming setup fails", async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  const env = {
    AI: {
      run: async () => ({
        getReader() {
          throw new Error("synthetic stream setup failure");
        }
      })
    },
    MEMORY: memory as any,
    MIND: mind as any,
    ASSETS: {
      fetch: async () => new Response("not-found", { status: 404 })
    },
    MODEL_ION: "primary-model",
    MODEL_SIMULATION: "simulation-model"
  } as any;

  const request = new Request("https://example.test/api/ION", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ION-session-id": "worker-stream-fallback"
    },
    body: JSON.stringify({
      mode: "auto",
      fastMode: true,
      messages: [
        {
          role: "user",
          content: "Play out a resilience stress test over 5 steps and summarize the system-state transitions in chat."
        }
      ]
    })
  });

  const response = await worker.fetch(request, env, createExecutionContext() as any);
  const sseText = await response.text();
  const firstEvent = extractFirstSseEvent(sseText);
  const simulation = firstEvent.simulation as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/event-stream");
  assert.equal(response.headers.get("X-ION-Simulation-Status"), "active");
  assert.ok(String(firstEvent.content || "").includes("Simulation sim_worker-stream-fallback_"));
  assert.ok(String(firstEvent.content || "").includes("Streaming fallback activated: synthetic stream setup failure"));
  assert.ok(simulation, "expected simulation payload in fallback SSE event");
  assert.equal(simulation.status, "active");
  assert.equal(simulation.targetSteps, 5);
  assert.equal(simulation.stepsExecuted, 3);
  assert.match(String(simulation.chatReport || ""), /Progress: 60% \(3\/5 steps\)/);
});

test("worker /api/ION delivers native stream chunks progressively", async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();
  const encoder = new TextEncoder();

  const providerStream = new ReadableStream({
    start(controller) {
      setTimeout(() => {
        controller.enqueue(encoder.encode('data: {"response":"hello"}\n\n'));
      }, 40);
      setTimeout(() => {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }, 120);
    }
  });

  const env = {
    AI: {
      run: async () => providerStream
    },
    MEMORY: memory as any,
    MIND: mind as any,
    ASSETS: {
      fetch: async () => new Response("not-found", { status: 404 })
    },
    MODEL_ION: "primary-model"
  } as any;

  const request = new Request("https://example.test/api/ION?fast=true", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ION-session-id": "worker-stream-progressive"
    },
    body: JSON.stringify({
      mode: "auto",
      messages: [
        {
          role: "user",
          content: "Send a streaming response."
        }
      ]
    })
  });

  const response = await worker.fetch(request, env, createExecutionContext() as any);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/event-stream");

  const reader = response.body?.getReader();
  assert.ok(reader, "Response body should expose a reader");

  const readPromise = reader.read();
  const result = await Promise.race([
    readPromise,
    new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 80))
  ]);

  assert.notEqual((result as any).timeout, true, "Expected first stream chunk before completion");
  assert.equal((result as any).done, false);
  const chunkText = new TextDecoder().decode((result as any).value || new Uint8Array());
  assert.match(chunkText, /data:\s*\{"content":"hello"/);
});

test("worker /api/ION keeps live internet retrieval enabled for freshness-sensitive fast queries", async () => {
  const originalFetch = globalThis.fetch;
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input instanceof Request
          ? input.url
          : String(input);
    if (url.includes("site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard")) {
      return new Response(
        JSON.stringify({
          events: [
            {
              date: "2026-04-17T19:00Z",
              links: [{ href: "https://www.espn.com/nba/game/_/gameId/401000001" }],
              competitions: [
                {
                  date: "2026-04-17T19:00Z",
                  status: { type: { description: "Scheduled" } },
                  competitors: [
                    { homeAway: "away", team: { displayName: "Milwaukee Bucks" } },
                    { homeAway: "home", team: { displayName: "Boston Celtics" } }
                  ]
                }
              ]
            }
          ]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const env = {
      AI: {
        run: async (_model: string, _input: unknown) => ({ response: "Grounded live response." })
      },
      MEMORY: memory as any,
      MIND: mind as any,
      ASSETS: {
        fetch: async () => new Response("not-found", { status: 404 })
      },
      MODEL_ION: "primary-model"
    } as any;

    const request = new Request("https://example.test/api/ION?fast=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ION-session-id": "worker-live-grounding"
      },
      body: JSON.stringify({
        mode: "auto",
        fastMode: true,
        messages: [
          {
            role: "user",
            content: "What NBA games are on today?"
          }
        ]
      })
    });

    const response = await worker.fetch(request, env, createExecutionContext() as any);
    const sseText = await response.text();
    const firstEvent = extractFirstSseEvent(sseText);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-ION-Fast-Chat"), "true");
    assert.equal(response.headers.get("X-ION-Internet-Count"), "1");
    assert.equal(firstEvent.content, "Grounded live response.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker /api/ION keeps general internet retrieval enabled for lookup-style fast queries", async () => {
  const originalFetch = globalThis.fetch;
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input instanceof Request
          ? input.url
          : String(input);
    if (url.includes("html.duckduckgo.com/html/?q=")) {
      return new Response(
        `
          <html>
            <body>
              <div class="result">
                <a class="result__a" href="https://www.microsoft.com/en-us/about/leadership/satya-nadella">Satya Nadella - Microsoft CEO</a>
                <div class="result__snippet">Satya Nadella is Chairman and Chief Executive Officer of Microsoft.</div>
              </div>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }

    if (url.includes("api.duckduckgo.com")) {
      return new Response(JSON.stringify({ RelatedTopics: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("en.wikipedia.org/w/api.php")) {
      return new Response(JSON.stringify(["", [], [], []]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url === "https://www.microsoft.com/en-us/about/leadership/satya-nadella") {
      return new Response(
        '<html><head><title>Satya Nadella, Chairman and CEO, Microsoft</title></head><body><main>Satya Nadella is Chairman and Chief Executive Officer of Microsoft.</main></body></html>',
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const env = {
      AI: {
        run: async (_model: string, _input: unknown) => ({ response: "Grounded general web response." })
      },
      MEMORY: memory as any,
      MIND: mind as any,
      ASSETS: {
        fetch: async () => new Response("not-found", { status: 404 })
      },
      MODEL_ION: "primary-model"
    } as any;

    const request = new Request("https://example.test/api/ION?fast=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ION-session-id": "worker-general-grounding"
      },
      body: JSON.stringify({
        mode: "auto",
        fastMode: true,
        messages: [
          {
            role: "user",
            content: "Who is the CEO of Microsoft?"
          }
        ]
      })
    });

    const response = await worker.fetch(request, env, createExecutionContext() as any);
    const sseText = await response.text();
    const firstEvent = extractFirstSseEvent(sseText);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-ION-Fast-Chat"), "true");
    assert.equal(response.headers.get("X-ION-Internet-Count"), "1");
    assert.equal(firstEvent.content, "Grounded general web response.");
    assert.equal(Array.isArray(firstEvent.sources), true);
    assert.equal((firstEvent.sources as Array<unknown>).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker /api/ION resolves weather for city-state prompts", async () => {
  const originalFetch = globalThis.fetch;
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("https://geocoding-api.open-meteo.com/v1/search?")) {
      return new Response(
        JSON.stringify({
          results: [
            {
              name: "Utica",
              admin1: "New York",
              country: "United States",
              latitude: 43.1009,
              longitude: -75.2327
            }
          ]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (url.startsWith("https://api.open-meteo.com/v1/forecast?")) {
      return new Response(
        JSON.stringify({
          timezone: "America/New_York",
          current_weather: {
            temperature: 9.5,
            windspeed: 11.2,
            weathercode: 3,
            time: "2026-04-17T14:00"
          },
          daily: {
            time: ["2026-04-17"],
            temperature_2m_max: [14.1],
            temperature_2m_min: [4.2],
            precipitation_probability_max: [25]
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (url.includes("html.duckduckgo.com/html/?q=")) {
      return new Response("<html><body></body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    if (url.includes("api.duckduckgo.com") || url.includes("en.wikipedia.org/w/api.php")) {
      return new Response(JSON.stringify(url.includes("api.duckduckgo.com") ? { RelatedTopics: [] } : ["", [], [], []]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const env = {
      AI: {
        run: async (_model: string, _input: unknown) => ({ response: "Grounded weather response." })
      },
      MEMORY: memory as any,
      MIND: mind as any,
      ASSETS: {
        fetch: async () => new Response("not-found", { status: 404 })
      },
      MODEL_ION: "primary-model"
    } as any;

    const request = new Request("https://example.test/api/ION?fast=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ION-session-id": "worker-weather-grounding"
      },
      body: JSON.stringify({
        mode: "auto",
        fastMode: true,
        messages: [
          {
            role: "user",
            content: "What's the weather for today in Utica, NY?"
          }
        ]
      })
    });

    const response = await worker.fetch(request, env, createExecutionContext() as any);
    const sseText = await response.text();
    const firstEvent = extractFirstSseEvent(sseText);

    assert.equal(response.status, 200);
    assert.equal(firstEvent.content, "Grounded weather response.");
    assert.equal(Array.isArray(firstEvent.sources), true);
    assert.equal((firstEvent.sources as Array<unknown>).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker /api/ION uses direct market data for stock market prompts", async () => {
  const originalFetch = globalThis.fetch;
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("https://query1.finance.yahoo.com/v7/finance/quote?symbols=")) {
      return new Response(
        JSON.stringify({
          quoteResponse: {
            result: [
              {
                symbol: "^GSPC",
                shortName: "S&P 500",
                regularMarketPrice: 5234.56,
                regularMarketChange: 48.22,
                regularMarketChangePercent: 0.93,
                marketState: "REGULAR",
                regularMarketTime: 1776441000,
                currency: "USD",
                fullExchangeName: "SNP"
              },
              {
                symbol: "^DJI",
                shortName: "Dow Jones Industrial Average",
                regularMarketPrice: 38765.43,
                regularMarketChange: 205.11,
                regularMarketChangePercent: 0.53,
                marketState: "REGULAR",
                regularMarketTime: 1776441000,
                currency: "USD",
                fullExchangeName: "DJI"
              },
              {
                symbol: "^IXIC",
                shortName: "NASDAQ Composite",
                regularMarketPrice: 16432.1,
                regularMarketChange: 121.33,
                regularMarketChangePercent: 0.74,
                marketState: "REGULAR",
                regularMarketTime: 1776441000,
                currency: "USD",
                fullExchangeName: "NASDAQ"
              }
            ]
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const env = {
      AI: {
        run: async (_model: string, input: unknown) => {
          const serialized = JSON.stringify(input);
          assert.match(serialized, /S&P 500/);
          assert.match(serialized, /NASDAQ Composite/);
          assert.match(serialized, /Market state: REGULAR/);
          return { response: "Grounded market response." };
        }
      },
      MEMORY: memory as any,
      MIND: mind as any,
      ASSETS: {
        fetch: async () => new Response("not-found", { status: 404 })
      },
      MODEL_ION: "primary-model"
    } as any;

    const request = new Request("https://example.test/api/ION?fast=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ION-session-id": "worker-market-grounding"
      },
      body: JSON.stringify({
        mode: "auto",
        fastMode: true,
        messages: [
          {
            role: "user",
            content: "What does the stock market look like today?"
          }
        ]
      })
    });

    const response = await worker.fetch(request, env, createExecutionContext() as any);
    const sseText = await response.text();
    const firstEvent = extractFirstSseEvent(sseText);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-ION-Internet-Count"), "3");
    assert.equal(firstEvent.content, "Grounded market response.");
    assert.equal(Array.isArray(firstEvent.sources), true);
    assert.equal((firstEvent.sources as Array<unknown>).length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker /api/ION image route streams v2 image payloads for chat clients", async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  const env = {
    AI: {
      run: async () => ({ response: "unused-for-image-route" })
    },
    MEMORY: memory as any,
    MIND: mind as any,
    ASSETS: {
      fetch: async () => new Response("not-found", { status: 404 })
    },
    MODEL_ION: "primary-model",
    ion_MOCK: "true",
    DEFAULT_CHECKPOINT: "ion-citizen-xl-vpred-v2.0"
  } as any;

  const request = new Request("https://example.test/api/ION", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ION-session-id": "worker-image-route"
    },
    body: JSON.stringify({
      mode: "auto",
      messages: [
        {
          role: "user",
          content: "/image Create image of an astronaut in a greenhouse with cinematic detail."
        }
      ]
    })
  });

  const response = await worker.fetch(request, env, createExecutionContext() as any);
  const sseText = await response.text();
  const firstEvent = extractFirstSseEvent(sseText);
  const image = firstEvent.image as Record<string, any>;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/event-stream");
  assert.equal(response.headers.get("X-ION-Orchestrator-Route"), "image");
  assert.equal(typeof firstEvent.content, "string");
  assert.match(String(firstEvent.content || ""), /Your image is ready\./);
  assert.match(String(firstEvent.imageDataUrl || ""), /^data:image\/png;base64,/);
  assert.equal(typeof image?.filename, "string");
  assert.equal(image?.metadata?.pipeline?.version, "v2");
  assert.equal(image?.metadata?.pipeline?.gateway, "mock");
  assert.equal(image?.metadata?.image?.exportLocation, "chat-download");
  assert.equal(typeof image?.model, "string");
});