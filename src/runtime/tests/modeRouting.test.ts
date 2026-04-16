import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizeIONMode, inferIONModeFromPrompt, normalizeConversationHints, resolveEffectiveIONMode } from "../../ION/modeRouting.ts";

test("canonicalizeIONMode maps legacy hidden aliases to active internal modes", () => {
  assert.equal(canonicalizeIONMode("analysis"), "analyst");
  assert.equal(canonicalizeIONMode("vision"), "visual");
  assert.equal(canonicalizeIONMode("cinematic"), "lore");
  assert.equal(canonicalizeIONMode("os"), "system-knowledge");
  assert.equal(canonicalizeIONMode("sim"), "simulation");
});

test("inferIONModeFromPrompt covers the hidden 12-mode capability surface", () => {
  const cases = [
    ["Design the architecture for a worker-based event pipeline.", "architect"],
    ["Compare the tradeoffs between D1 and KV for this workload.", "analyst"],
    ["Give me art direction, palette, and composition notes for this scene.", "visual"],
    ["Expand the lore and backstory for this character arc.", "lore"],
    ["Reason through this proof step by step and resolve the contradiction.", "reasoning"],
    ["Refactor this TypeScript function and fix the test failure.", "coding"],
    ["What do the docs and specs say about this protocol?", "knowledge"],
    ["Explain how the ION worker runtime and codex modules fit together internally.", "system-knowledge"],
    ["Map the neck, spine, and cranial nerve subsystems involved here.", "anatomy"],
    ["Simulate this business scenario over five turns and show state changes.", "simulation"],
    ["Run a galactic orbit simulation for a Milky Way satellite trajectory.", "cosmic"],
    ["Explore a multiverse-scale cosmology query across the cosmic web.", "multiverse"]
  ] as const;

  for (const [prompt, expectedMode] of cases) {
    assert.equal(inferIONModeFromPrompt(prompt), expectedMode, `Expected ${expectedMode} for: ${prompt}`);
  }
});

test("resolveEffectiveIONMode keeps hidden mode continuity for follow-up turns", () => {
  const resolved = resolveEffectiveIONMode({
    requestedMode: "auto",
    latestUserText: "continue and go deeper",
    conversationHints: normalizeConversationHints({
      latestUserIntent: "keep exploring the same simulation",
      recentUserFocus: ["simulate the supply chain shock across three steps"]
    }),
    lastMode: "simulation"
  });

  assert.equal(resolved, "simulation");
});