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