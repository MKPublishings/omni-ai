import assert from "node:assert/strict";
import test from "node:test";
import { omniBrainLoop } from "../loop.ts";

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

test("omniBrainLoop attaches simulation context for simulation mode", async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  const result = await omniBrainLoop(
    {
      AI: {
        run: async () => ({ response: "Simulation response stable." })
      },
      MEMORY: memory as any,
      MIND: mind as any,
      MODEL_OMNI: "primary-model",
      MODEL_SIMULATION: "simulation-model"
    },
    {
      mode: "simulation",
      model: "omni",
      messages: [{ role: "user", content: "simulate system recovery under pressure" }],
      maxOutputTokens: 256
    }
  );

  assert.equal(result.response, "Simulation response stable.");
  assert.equal(result.simulationUsed, true);
  assert.equal(result.modelUsed, "simulation-model");
  assert.ok(result.diagnostics.some((entry) => entry.startsWith("simulation:")));
});

test("omniBrainLoop recovers from prompt budget overflow for long user input", async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  const longPrompt = `${"This is a long planning paragraph with multiple constraints and dependencies. ".repeat(220)}Final objective: provide an answer.`;

  const result = await omniBrainLoop(
    {
      AI: {
        run: async (_model: string, input: any) => {
          const totalChars = Array.isArray(input?.messages)
            ? input.messages.reduce((sum: number, message: any) => sum + String(message?.content || "").length, 0)
            : 0;

          if (totalChars > 9000) {
            throw new Error("prompt too long: context length exceeded");
          }

          return { response: "Recovered response after compaction." };
        }
      },
      MEMORY: memory as any,
      MIND: mind as any,
      MODEL_OMNI: "primary-model"
    },
    {
      mode: "analysis",
      model: "omni",
      messages: [{ role: "user", content: longPrompt }],
      maxOutputTokens: 512
    }
  );

  assert.equal(result.response, "Recovered response after compaction.");
  assert.ok(result.diagnostics.includes("runtime:prompt-budget-retry"));
  assert.ok(result.diagnostics.includes("runtime:compact-retry-succeeded"));
});

test("omniBrainLoop returns native stream when preferStreaming is enabled", async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();
  const encoder = new TextEncoder();

  const modelStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("data: {\"response\":\"stream-token\"}\n\n"));
      controller.close();
    }
  });

  const result = await omniBrainLoop(
    {
      AI: {
        run: async () => modelStream
      },
      MEMORY: memory as any,
      MIND: mind as any,
      MODEL_OMNI: "primary-model"
    },
    {
      mode: "auto",
      model: "omni",
      messages: [{ role: "user", content: "Respond fast." }],
      maxOutputTokens: 256,
      preferStreaming: true
    }
  );

  assert.ok(result.stream);
  assert.equal(result.response, "");
  assert.ok(result.diagnostics.includes("streaming:native"));
});