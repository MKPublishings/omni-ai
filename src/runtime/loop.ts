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
      systemMessages.push(makeSystemMessage(`Perception snapshot:\n${perception.summary}`));
    }

    if (simulationContext) {
      systemMessages.push(
        makeSystemMessage(
          [
            "Simulation substrate:",
            simulationContext.systemPrompt,
            "Simulation log:",
            simulationContext.logsSummary
          ].join("\n")
        )
      );
      diagnostics.push("simulation:context-attached");
    }

    let modelUsed = route.selectedModel;
    let fallbackUsed = false;
    let reasoning;

    try {
      reasoning = await runInternalSimulation({
        env,
        model: route.selectedModel,
        identity,
        messages: [...systemMessages, ...safeMessages],
        maxOutputTokens
      });
    } catch {
      reasoning = await runInternalSimulation({
        env,
        model: route.fallbackModel,
        identity,
        messages: [...systemMessages, ...safeMessages],
        maxOutputTokens
      });
      modelUsed = route.fallbackModel;
      fallbackUsed = route.fallbackModel !== route.selectedModel;
      diagnostics.push("routing:fallback-model");
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