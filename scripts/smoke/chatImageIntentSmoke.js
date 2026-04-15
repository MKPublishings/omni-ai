const assert = require("node:assert/strict");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const chatFile = path.join(repoRoot, "scripts", "shared", "chatClientRuntime.js");
const { isImageGenerationRequest, extractImagePrompt, detectAutoMediaIntent } = require(chatFile);

assert.equal(typeof isImageGenerationRequest, "function", "isImageGenerationRequest should be available");
assert.equal(typeof extractImagePrompt, "function", "extractImagePrompt should be available");
assert.equal(typeof detectAutoMediaIntent, "function", "detectAutoMediaIntent should be available");

const conversationalCases = [
  "create a plan for my startup",
  "we should create better docs for ION",
  "I want to make this project faster",
  "imagine we improve onboarding next week",
  "create, for me, a roadmap for the next sprint"
];

for (const input of conversationalCases) {
  const mediaIntent = detectAutoMediaIntent(input);
  assert.equal(mediaIntent.kind, "chat", `Expected chat intent for: ${input}`);
  assert.equal(isImageGenerationRequest(input), false, `Expected no image trigger for: ${input}`);
}

const explicitImageCases = [
  "create an image of a startup logo",
  "generate an image of a neon city",
  "make an image for a mountain sunrise",
  "imagine an image of a friendly robot",
  "create an image: cyberpunk owl",
  "generate an image, watercolor koi fish"
];

for (const input of explicitImageCases) {
  const mediaIntent = detectAutoMediaIntent(input);
  assert.equal(mediaIntent.kind, "image", `Expected image intent for: ${input}`);
  assert.equal(isImageGenerationRequest(input), true, `Expected image trigger for: ${input}`);
  assert.ok(extractImagePrompt(input).length > 0, `Expected extracted prompt for: ${input}`);
}

assert.equal(isImageGenerationRequest("/image cyberpunk skyline"), true, "Expected /image command to trigger");

console.log("✓ create keyword remains conversational unless explicit image intent is present");
console.log("✓ explicit image phrases and /image command trigger image generation intent");
console.log("Chat image intent smoke test passed.");
