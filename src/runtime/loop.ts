import type { KVNamespace } from "@cloudflare/workers-types";
import { advanceSimulationState, type SimulationContext } from "../omni/simulation/engine.ts";
import { loadIdentityKernel, evolveIdentityKernel } from "../omni/intelligence/identityKernel.ts";
import { runInternalSimulation } from "../omni/intelligence/internalSimulation.ts";
import type { OmniReasoningMessage } from "../omni/intelligence/reasoningStack.ts";
import { buildPerceptionSnapshot } from "./retrieval.ts";
import { resolveRuntimeRoute } from "./router.ts";

export interface OmniLoopMessage {
  role: string;
  content: string;
}

export interface OmniLoopContext {
  mode: string;
  model: string;
  messages: OmniLoopMessage[];
  maxOutputTokens?: number;
  simulationContext?: SimulationContext | null;
}

export interface OmniLoopResult {
  response: string;
  modelUsed: string;
  fallbackUsed: boolean;
  diagnostics: string[];
  simulationUsed: boolean;
}

type OmniRuntimeEnv = {
  AI?: { run?: (model: string, input: unknown) => Promise<any> };
  MIND?: KVNamespace;
  MEMORY?: KVNamespace;
  MODEL_OMNI?: string;
  MODEL_SIMULATION?: string;
  OMNI_SIMULATION_PATHS?: string;
};

const MAX_CONTEXT_MESSAGES = 20;
const MAX_CONTEXT_TOTAL_CHARS = 24000;
const MAX_SYSTEM_MESSAGE_CHARS = 2200;
const MAX_ASSISTANT_MESSAGE_CHARS = 2600;
const MAX_USER_MESSAGE_CHARS = 10000;

function compactText(value: unknown, maxChars: number): string {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;

  const head = Math.max(240, Math.floor(maxChars * 0.6));
  const tail = Math.max(120, maxChars - head - 48);
  return `${text.slice(0, head)} ... [truncated] ... ${text.slice(-tail)}`;
}

function capMessageByRole(message: OmniReasoningMessage): OmniReasoningMessage {
  if (message.role === "system") {
    return { ...message, content: compactText(message.content, MAX_SYSTEM_MESSAGE_CHARS) };
  }

  if (message.role === "assistant") {
    return { ...message, content: compactText(message.content, MAX_ASSISTANT_MESSAGE_CHARS) };
  }

  return { ...message, content: compactText(message.content, MAX_USER_MESSAGE_CHARS) };
}

function compactContextMessages(messages: OmniReasoningMessage[]): OmniReasoningMessage[] {
  const normalized = messages
    .map((message) => ({ role: normalizeRole(message.role), content: String(message.content || "") }))
    .map(capMessageByRole)
    .filter((message) => message.content.length > 0);

  const trimmedByCount = normalized.slice(-MAX_CONTEXT_MESSAGES);
  const latestUser = [...trimmedByCount].reverse().find((message) => message.role === "user") || null;

  let totalChars = trimmedByCount.reduce((sum, message) => sum + message.content.length, 0);
  const result = [...trimmedByCount];

  for (let index = 0; index < result.length && totalChars > MAX_CONTEXT_TOTAL_CHARS; index += 1) {
    const candidate = result[index];
    if (latestUser && candidate === latestUser) continue;

    const removable = Math.max(0, candidate.content.length - 120);
    if (removable <= 0) continue;

    candidate.content = compactText(candidate.content, Math.max(120, candidate.content.length - removable));
    totalChars = result.reduce((sum, message) => sum + message.content.length, 0);
  }

  return result;
}

function compactSystemContext(input: string, maxChars: number): string {
  return compactText(input, maxChars);
}

function isPromptBudgetError(error: unknown): boolean {
  const raw = String((error as any)?.message || error || "").toLowerCase();
  return (
    raw.includes("prompt too long") ||
    raw.includes("input too long") ||
    raw.includes("context length") ||
    raw.includes("context window") ||
    raw.includes("maximum context") ||
    raw.includes("max context") ||
    raw.includes("token limit") ||
    raw.includes("too many tokens") ||
    raw.includes("request too large")
  );
}

function buildEmergencyContext(messages: OmniReasoningMessage[], latestUserText: string): OmniReasoningMessage[] {
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const emergency: OmniReasoningMessage[] = [
    {
      role: "system",
      content:
        "Use concise reasoning and answer directly. Context was compacted for reliability due to request size."
    }
  ];

  if (latestAssistant?.content) {
    emergency.push({
      role: "assistant",
      content: compactText(latestAssistant.content, 700)
    });
  }

  emergency.push({
    role: "user",
    content: compactText(latestUserText, 7000)
  });

  return emergency;
}

function extractResponseText(raw: any): string {
  return String(
    typeof raw === "string"
      ? raw
      : raw?.response ??
          raw?.result?.response ??
          raw?.output_text ??
          raw?.choices?.[0]?.message?.content ??
          ""
  );
}

function normalizeRole(role: string): OmniReasoningMessage["role"] {
  if (role === "system" || role === "assistant" || role === "user") return role;
  return "user";
}

function makeSystemMessage(content: string): OmniReasoningMessage {
  return { role: "system", content };
}

export async function omniBrainLoop(
  env: OmniRuntimeEnv,
  ctx: OmniLoopContext
): Promise<OmniLoopResult> {
  const diagnostics: string[] = [];

  try {
    if (!env?.AI?.run) {
      return {
        response: "AI binding is not configured.",
        modelUsed: "none",
        fallbackUsed: false,
        diagnostics: ["runtime:offline"],
        simulationUsed: false
      };
    }

    const maxOutputTokens =
      Number.isFinite(ctx.maxOutputTokens) && Number(ctx.maxOutputTokens) > 0
        ? Math.floor(Number(ctx.maxOutputTokens))
        : 2048;

    const safeMessages: OmniReasoningMessage[] = (ctx.messages || [])
      .map((message) => ({
        role: normalizeRole(String(message.role || "")),
        content: String(message.content || "")
      }))
      .filter((message) => message.content.trim().length > 0);

    const latestUserText = [...safeMessages]
      .reverse()
      .find((message) => message.role === "user")
      ?.content || "";

    let simulationContext = ctx.simulationContext ?? null;
    if (!simulationContext && String(ctx.mode || "").toLowerCase() === "simulation") {
      simulationContext = await advanceSimulationState(env, safeMessages);
      diagnostics.push("simulation:stepped-in-loop");
    }

    const route = resolveRuntimeRoute(
      {
        mode: ctx.mode,
        latestUserText,
        requestedModel: ctx.model,
        hasSimulationContext: Boolean(simulationContext)
      },
      env
    );
    diagnostics.push(`routing:${route.reason}`);

    const perception = buildPerceptionSnapshot({
      latestUserText,
      messages: safeMessages,
      simulationContext
    });
    diagnostics.push(`perception:hits=${perception.hits.length}`);

    const identity = await loadIdentityKernel(env);

    const systemMessages: OmniReasoningMessage[] = [
      makeSystemMessage([
        "Cognitive phases: perception -> deliberation -> simulation -> decision -> update.",
        `Route capability: ${route.capability}.`,
        `Route constraints: ${route.policy.constraints.join(", ")}.`
      ].join("\n"))
    ];

    if (perception.summary) {
      systemMessages.push(makeSystemMessage(`Perception snapshot:\n${compactSystemContext(perception.summary, 2600)}`));
    }

    if (simulationContext) {
      systemMessages.push(
        makeSystemMessage(
          [
            "Simulation substrate:",
            compactSystemContext(simulationContext.systemPrompt, 1800),
            "Simulation log:",
            compactSystemContext(simulationContext.logsSummary, 1400)
          ].join("\n")
        )
      );
      diagnostics.push("simulation:context-attached");
    }

    let modelUsed = route.selectedModel;
    let fallbackUsed = false;
    let reasoning;
    const primaryContext = compactContextMessages([...systemMessages, ...safeMessages]);

    try {
      reasoning = await runInternalSimulation({
        env,
        model: route.selectedModel,
        identity,
        messages: primaryContext,
        maxOutputTokens
      });
    } catch (primaryError) {
      diagnostics.push("runtime:primary-inference-failed");

      const shouldCompactRetry = isPromptBudgetError(primaryError);
      const emergencyContext = shouldCompactRetry
        ? buildEmergencyContext(primaryContext, latestUserText)
        : primaryContext;

      if (shouldCompactRetry) {
        diagnostics.push("runtime:prompt-budget-retry");
      }

      try {
        reasoning = await runInternalSimulation({
          env,
          model: route.selectedModel,
          identity,
          messages: emergencyContext,
          maxOutputTokens: Math.min(maxOutputTokens, 1536)
        });
        diagnostics.push("runtime:compact-retry-succeeded");
      } catch (retryError) {
        reasoning = await runInternalSimulation({
          env,
          model: route.fallbackModel,
          identity,
          messages: emergencyContext,
          maxOutputTokens: Math.min(maxOutputTokens, 1536)
        });
        modelUsed = route.fallbackModel;
        fallbackUsed = route.fallbackModel !== route.selectedModel;
        diagnostics.push("routing:fallback-model");

        if (isPromptBudgetError(retryError)) {
          diagnostics.push("runtime:prompt-budget-fallback");
        }
      }
    }

    if (latestUserText) {
      await evolveIdentityKernel(env, identity, `Recent focus: ${latestUserText.slice(0, 180)}`);
      diagnostics.push("identity:evolved");
    }

    return {
      response: extractResponseText(reasoning.response),
      modelUsed,
      fallbackUsed,
      diagnostics,
      simulationUsed: Boolean(simulationContext)
    };
  } catch {
    return {
      response: "Runtime loop failed.",
      modelUsed: "error",
      fallbackUsed: false,
      diagnostics: [...diagnostics, "runtime:failure"],
      simulationUsed: false
    };
  }
}