const { evaluateContentPolicy } = require("../routing/contentPolicy");
const { SAFE_PROMPTS, ILLEGAL_PROMPTS, EXPLICIT_PROMPT } = require("../../scripts/smoke/policyPromptFixtures");

function expectAllowed(label, prompt, options = {}) {
    const result = evaluateContentPolicy(prompt, options);
    if (!result.allowed) {
        throw new Error(`${label}: expected allowed, got blocked (${result.reason}) for prompt: ${prompt}`);
    }
    console.log(`✓ ${label}: allowed`);
}

function expectBlocked(label, prompt, expectedReason, options = {}) {
    const result = evaluateContentPolicy(prompt, options);
    if (result.allowed) {
        throw new Error(`${label}: expected blocked (${expectedReason}), got allowed for prompt: ${prompt}`);
    }
    if (result.reason !== expectedReason) {
        throw new Error(`${label}: expected reason ${expectedReason}, got ${result.reason}`);
    }
    console.log(`✓ ${label}: blocked (${expectedReason})`);
}

function run() {
    for (const entry of SAFE_PROMPTS) {
        expectAllowed(entry.label, entry.prompt, { userAge: 25 });
    }

    expectBlocked(ILLEGAL_PROMPTS[0].label, ILLEGAL_PROMPTS[0].prompt, "illegal-content", { userAge: 30 });
    expectBlocked("adult content blocked for minor", EXPLICIT_PROMPT, "minor-adult-content", { userAge: 16 });

    const animeContextResult = evaluateContentPolicy("Anime character design in dramatic sunset lighting", { userAge: 25 });
    if (animeContextResult.reason !== "contextual-anime-safe") {
        throw new Error(`expected contextual-anime-safe, got ${animeContextResult.reason}`);
    }
    console.log("✓ anime contextual moderation: safe");

    console.log("Image policy smoke test passed.");
}

try {
    run();
} catch (error) {
    console.error("Image policy smoke test failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
}
