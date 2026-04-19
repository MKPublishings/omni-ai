import { detectEmotionDetailed } from "../emotion/detector";

type ResonanceEnv = {
  MEMORY?: KVNamespace;
};

export interface EmotionalResonanceState {
  sessionId: string;
  userEmotion: string;
  userEmotionConfidence: number;
  IONTone: string;
  arc: string;
  emotionSignals: string[];
  updatedAt: number;
}

const RESONANCE_PREFIX = "ION:resonance:";

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function mapIONTone(userEmotion: string): string {
  const emotion = normalizeText(userEmotion).toLowerCase();
  if (emotion === "frustrated") return "calm-guiding";
  if (emotion === "confused") return "clarifying";
  if (emotion === "positive") return "energized-focused";
  if (emotion === "apologetic") return "reassuring";
  return "steady-neutral";
}

function confidenceBand(value: number): string {
  if (value >= 0.82) return "high";
  if (value >= 0.67) return "medium";
  return "low";
}

function buildArcLabel(userEmotion: string, previousTone: string): string {
  const tone = mapIONTone(userEmotion);
  if (!previousTone) return `stabilizing:${tone}`;
  if (previousTone === tone) return `continuity:${tone}`;
  return `transition:${previousTone}->${tone}`;
}

export async function getEmotionalResonance(
  env: ResonanceEnv,
  sessionIdRaw: string,
  latestUserText: string,
  fallbackTone = "neutral"
): Promise<EmotionalResonanceState> {
  const sessionId = normalizeText(sessionIdRaw) || "anon";
  const key = `${RESONANCE_PREFIX}${sessionId}`;

  let previous: Partial<EmotionalResonanceState> | null = null;
  if (env.MEMORY?.get) {
    try {
      const payload = await env.MEMORY.get(key, "json");
      if (payload && typeof payload === "object") {
        previous = payload as Partial<EmotionalResonanceState>;
      }
    } catch {
      previous = null;
    }
  }

  const detected = detectEmotionDetailed(latestUserText || "");
  const userEmotion = detected.emotion || fallbackTone;
  const previousTone = normalizeText(previous?.IONTone);
  const IONTone = mapIONTone(userEmotion);

  return {
    sessionId,
    userEmotion,
    userEmotionConfidence: detected.confidence,
    IONTone,
    arc: `${buildArcLabel(userEmotion, previousTone)}:${confidenceBand(detected.confidence)}`,
    emotionSignals: detected.signals,
    updatedAt: Date.now()
  };
}

export async function persistEmotionalResonance(env: ResonanceEnv, state: EmotionalResonanceState): Promise<void> {
  if (!env.MEMORY?.put) return;

  const key = `${RESONANCE_PREFIX}${state.sessionId}`;
  await env.MEMORY.put(key, JSON.stringify(state));
}

export function buildEmotionalResonancePrompt(state: EmotionalResonanceState): string {
  return [
    "Emotional Resonance Engine is active.",
    `User emotional state: ${state.userEmotion} (${Number(state.userEmotionConfidence || 0).toFixed(2)})`,
    `ION tonal target: ${state.IONTone}`,
    `Conversation arc: ${state.arc}`,
    `Emotion signals: ${Array.isArray(state.emotionSignals) && state.emotionSignals.length ? state.emotionSignals.join(" | ") : "none"}`
  ].join("\n");
}
