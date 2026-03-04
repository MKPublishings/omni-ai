const { normalizePromptLanguage } = require("../core/promptNormalizer");
const MAX_PROMPT_CHARS = 10000;

function ensureType(value, fallback = "image") {
    const normalized = String(value || fallback).toLowerCase();
    if (["image", "auto"].includes(normalized)) {
        return normalized;
    }
    return "image";
}

function applyGenerationToken(prompt, intent) {
    void intent;
    const raw = String(prompt || "").trim();
    if (!raw) return raw;

    return raw;
}

function normalizeStillPromptLanguage(prompt) {
    return String(prompt || "")
    .replace(/\bcinematic\b(?!\s+lighting)/gi, "cinematic lighting")
    .replace(/\bdynamic\b(?!\s+composition)/gi, "dynamic composition")
    .replace(/\bscene\b(?!\s*\b(still|composition)\b)/gi, "still scene")
    .replace(/\b(\w+)(\s+\1\b)+/gi, "$1");
}

function validatePromptForGeneration(prompt, options = {}) {
    const requestedType = ensureType(options.requestedType, "image");
    const resolvedType = "image";
    const promptNormalization = normalizePromptLanguage(prompt);
    let normalizedPrompt = applyGenerationToken(promptNormalization.cleanedPrompt, resolvedType);
    normalizedPrompt = normalizeStillPromptLanguage(normalizedPrompt);

    if (normalizedPrompt.length > MAX_PROMPT_CHARS) {
        const error = new Error(`Prompt is too long for image generation. Please keep it under ${MAX_PROMPT_CHARS} characters.`);
        error.code = "prompt-too-long";
        throw error;
    }

    return {
        requestedType,
        resolvedType,
        normalizedPrompt,
        promptNormalization,
        routing: {
            intent: "image",
            confidence: 1,
            threshold: 1,
            shouldAskUser: false,
            matched: {
                image: []
            }
        }
    };
}

module.exports = {
    applyGenerationToken,
    validatePromptForGeneration,
    normalizeStillPromptLanguage
};
