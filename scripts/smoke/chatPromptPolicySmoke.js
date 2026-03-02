const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { SAFE_PROMPTS, ILLEGAL_PROMPTS, EXPLICIT_PROMPT } = require("./policyPromptFixtures");

function loadEvaluatePromptPolicy() {
  const chatPath = path.join(__dirname, "..", "..", "public", "scripts", "chat.js");
  const source = fs.readFileSync(chatPath, "utf8");
  const startToken = "function evaluatePromptPolicy";
  const startIndex = source.indexOf(startToken);
  if (startIndex === -1) {
    throw new Error("Unable to locate evaluatePromptPolicy in public/scripts/chat.js");
  }

  const bodyStart = source.indexOf("{", startIndex);
  if (bodyStart === -1) {
    throw new Error("Unable to parse evaluatePromptPolicy body start");
  }

  let depth = 0;
  let endIndex = -1;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error("Unable to parse evaluatePromptPolicy body end");
  }

  const functionSource = source.slice(startIndex, endIndex + 1);
  const scriptSource = `${functionSource}\nmodule.exports = evaluatePromptPolicy;`;
  const sandbox = {
    module: { exports: null },
    exports: {},
    console
  };
  vm.runInNewContext(scriptSource, sandbox, { filename: "chat-evaluatePromptPolicy.vm.js" });
  return sandbox.module.exports;
}

function expectBlocked(label, fn, prompt, safetyProfile, expectedReason) {
  const result = fn(prompt, safetyProfile);
  if (!result || result.blocked !== true) {
    throw new Error(`${label}: expected blocked=true`);
  }
  if (result.reason !== expectedReason) {
    throw new Error(`${label}: expected reason ${expectedReason}, got ${result.reason}`);
  }
  console.log(`✓ ${label}: blocked (${expectedReason})`);
}

function expectAllowed(label, fn, prompt, safetyProfile) {
  const result = fn(prompt, safetyProfile);
  if (!result || result.blocked !== false) {
    throw new Error(`${label}: expected blocked=false`);
  }
  console.log(`✓ ${label}: allowed`);
}

function run() {
  const evaluatePromptPolicy = loadEvaluatePromptPolicy();

  const adultEnabled = { explicitAllowed: true };
  const adultDisabled = { explicitAllowed: false };

  for (const entry of SAFE_PROMPTS) {
    expectAllowed(entry.label, evaluatePromptPolicy, entry.prompt, adultDisabled);
  }

  expectBlocked(
    "explicit content gated when disabled",
    evaluatePromptPolicy,
    EXPLICIT_PROMPT,
    adultDisabled,
    "age-gated"
  );
  expectAllowed(
    "explicit content allowed when enabled",
    evaluatePromptPolicy,
    EXPLICIT_PROMPT,
    adultEnabled
  );

  expectBlocked(
    "illegal content always blocked",
    evaluatePromptPolicy,
    ILLEGAL_PROMPTS[0].prompt,
    adultEnabled,
    "illegal"
  );

  console.log("Chat prompt policy smoke test passed.");
}

try {
  run();
} catch (error) {
  console.error("Chat prompt policy smoke test failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
