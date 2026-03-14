import type { SimulationContext } from "../omni/simulation/engine.ts";

export interface RetrievalMessage {
  role: string;
  content: string;
}

export type RetrievalSourceTag = "conversation" | "simulation-state" | "simulation-history";

export interface RetrievalHit {
  source: RetrievalSourceTag;
  score: number;
  text: string;
  tag: string;
}

export interface PerceptionSnapshot {
  summary: string;
  hits: RetrievalHit[];
  dominantTerms: string[];
}

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokenize(value: unknown): string[] {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .slice(0, 32);
}

function scoreText(queryTokens: string[], text: string, sourceWeight: number): number {
  if (!queryTokens.length || !text) return 0;

  const haystack = text.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    const exact = haystack.match(new RegExp(`\\b${token}\\b`, "g"))?.length || 0;
    if (exact > 0) {
      score += exact * 7;
      continue;
    }
    if (haystack.includes(token)) {
      score += 2;
    }
  }

  return score * sourceWeight;
}

function buildCandidates(
  messages: RetrievalMessage[],
  simulationContext?: SimulationContext | null
): Array<{ source: RetrievalSourceTag; tag: string; text: string; weight: number }> {
  const candidates: Array<{ source: RetrievalSourceTag; tag: string; text: string; weight: number }> = [];

  for (const message of messages.slice(-8)) {
    const content = normalizeText(message.content);
    if (!content) continue;
    candidates.push({
      source: "conversation",
      tag: String(message.role || "user").toLowerCase(),
      text: content,
      weight: 1
    });
  }

  if (simulationContext?.systemPrompt) {
    candidates.push({
      source: "simulation-state",
      tag: "system-prompt",
      text: normalizeText(simulationContext.systemPrompt),
      weight: 1.35
    });
  }

  if (simulationContext?.logsSummary) {
    for (const line of normalizeText(simulationContext.logsSummary).split(/\s*\[?20\d\d-/).filter(Boolean).slice(-6)) {
      candidates.push({
        source: "simulation-history",
        tag: "log-entry",
        text: normalizeText(line),
        weight: 1.2
      });
    }
  }

  return candidates;
}

export function buildPerceptionSnapshot(input: {
  latestUserText: string;
  messages: RetrievalMessage[];
  simulationContext?: SimulationContext | null;
}): PerceptionSnapshot {
  const queryTokens = tokenize(input.latestUserText);
  const candidates = buildCandidates(input.messages, input.simulationContext);

  const hits = candidates
    .map((candidate) => ({
      source: candidate.source,
      tag: candidate.tag,
      text: candidate.text,
      score: scoreText(queryTokens, candidate.text, candidate.weight)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  const dominantTerms = queryTokens.slice(0, 6);
  const summary = hits.length
    ? hits.map((hit, index) => `${index + 1}. [${hit.source}/${hit.tag}] ${hit.text}`).join("\n")
    : "No high-signal prior context matched the latest user objective.";

  return {
    summary,
    hits,
    dominantTerms
  };
}