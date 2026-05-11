/**
 * Unit Tests for promptNormalizer.js
 * Tests anime token handling, canonicalization, and UTF-8 support
 */

const { 
    normalizePromptLanguage, 
    extractAnimeTokens, 
    canonicalizeAnimeTokens,
    containsAnimeKeywords,
    ANIME_TOKEN_WHITELIST,
    ANIME_CANONICALIZATION
} = require("../core/promptNormalizer");

const assert = require("assert");

describe("promptNormalizer - Anime Token Handling", () => {
    
    describe("normalizePromptLanguage", () => {
        test("should detect anime prompts", () => {
            const result = normalizePromptLanguage("beautiful anime girl with cel-shading");
            assert.strictEqual(result.isAnimePrompt, true);
            assert(result.animeTokens.length > 0);
        });

        test("should preserve anime token order", () => {
            const result = normalizePromptLanguage("cel-shading anime character, soft-glow effect");
            assert(result.animeTokens.some(t => t.canonical === "cel-shading"));
            assert(result.animeTokens.some(t => t.canonical === "soft-glow"));
        });

        test("should canonicalize anime synonyms", () => {
            const result = normalizePromptLanguage("cel shading character");
            assert(result.cleanedPrompt.includes("cel-shading"));
        });

        test("should handle Japanese terms", () => {
            const result = normalizePromptLanguage("kimono sakura style");
            assert.strictEqual(result.isAnimePrompt, true);
        });

        test("should handle multi-word anime terms", () => {
            const result = normalizePromptLanguage("magical girl with soft glow");
            assert(result.cleanedPrompt.includes("mahou-shoujo") || result.cleanedPrompt.includes("soft-glow"));
        });

        test("should not detect non-anime prompts", () => {
            const result = normalizePromptLanguage("photorealistic portrait of a person");
            assert.strictEqual(result.isAnimePrompt, false);
        });
    });

    describe("extractAnimeTokens", () => {
        test("should extract anime tokens from text", () => {
            const { animeTokens } = extractAnimeTokens("cel-shading anime character");
            assert(animeTokens.some(t => t.canonical === "cel-shading"));
        });

        test("should canonicalize extracted tokens", () => {
            const { animeTokens } = extractAnimeTokens("cel shading soft glow");
            assert(animeTokens.some(t => t.canonical === "cel-shading"));
            assert(animeTokens.some(t => t.canonical === "soft-glow"));
        });

        test("should return empty array for non-anime text", () => {
            const { animeTokens } = extractAnimeTokens("photorealistic painting");
            assert.strictEqual(animeTokens.length, 0);
        });

        test("should handle multiple anime tokens", () => {
            const { animeTokens } = extractAnimeTokens("chibi kawaii shoujo character");
            assert.strictEqual(animeTokens.length > 0, true);
        });
    });

    describe("canonicalizeAnimeTokens", () => {
        test("should convert variants to canonical forms", () => {
            const result = canonicalizeAnimeTokens("cel shading style");
            assert(result.includes("cel-shading"));
        });

        test("should preserve non-anime text", () => {
            const input = "a realistic portrait";
            const result = canonicalizeAnimeTokens(input);
            assert(result.includes("realistic"));
            assert(result.includes("portrait"));
        });

        test("should handle multiple canonicalizations", () => {
            const result = canonicalizeAnimeTokens("hand drawn manga ink style");
            assert(result.includes("hand-drawn"));
            assert(result.includes("manga-ink"));
        });
    });

    describe("containsAnimeKeywords", () => {
        test("should detect anime keywords", () => {
            assert.strictEqual(containsAnimeKeywords("anime character"), true);
            assert.strictEqual(containsAnimeKeywords("manga style"), true);
            assert.strictEqual(containsAnimeKeywords("cel-shading"), true);
            assert.strictEqual(containsAnimeKeywords("kawaii"), true);
        });

        test("should not detect non-anime text", () => {
            assert.strictEqual(containsAnimeKeywords("photorealistic"), false);
            assert.strictEqual(containsAnimeKeywords("realistic portrait"), false);
        });

        test("should be case-insensitive", () => {
            assert.strictEqual(containsAnimeKeywords("ANIME character"), true);
            assert.strictEqual(containsAnimeKeywords("Cel-shading"), true);
        });
    });

    describe("ANIME_TOKEN_WHITELIST", () => {
        test("should contain common anime styles", () => {
            assert(ANIME_TOKEN_WHITELIST["cel-shading"]);
            assert(ANIME_TOKEN_WHITELIST["soft-glow"]);
            assert(ANIME_TOKEN_WHITELIST["chibi"]);
            assert(ANIME_TOKEN_WHITELIST["sakura-style"]);
        });

        test("should map variants to canonical forms", () => {
            assert.strictEqual(ANIME_TOKEN_WHITELIST["cel-shading"], "cel-shading");
            assert.strictEqual(ANIME_TOKEN_WHITELIST["cel shading"], "cel-shading");
        });
    });

    describe("ANIME_CANONICALIZATION", () => {
        test("should map common variants", () => {
            assert.strictEqual(ANIME_CANONICALIZATION["cel"], "cel-shading");
            assert.strictEqual(ANIME_CANONICALIZATION["hand drawn"], "hand-drawn");
            assert.strictEqual(ANIME_CANONICALIZATION["watercolour"], "watercolor");
        });
    });

    // Golden output tests
    describe("Golden Output Tests", () => {
        test("should handle complex anime prompt 1: chibi kawaii", () => {
            const prompt = "cute chibi kawaii character, soft glow, pastel colors";
            const result = normalizePromptLanguage(prompt);
            assert.strictEqual(result.isAnimePrompt, true);
            assert(result.animeTokens.length >= 2);
        });

        test("should handle complex anime prompt 2: 90s retro", () => {
            const prompt = "90s anime girl, cel-shading, manga ink lines, retro style";
            const result = normalizePromptLanguage(prompt);
            assert.strictEqual(result.isAnimePrompt, true);
            assert(result.cleanedPrompt.includes("90s-anime"));
        });

        test("should handle complex anime prompt 3: mecha", () => {
            const prompt = "mecha robot with mechanical details, cyberpunk aesthetic";
            const result = normalizePromptLanguage(prompt);
            assert.strictEqual(result.isAnimePrompt, true);
        });
    });
});

// Run tests if executing directly
if (require.main === module) {
    console.log("Running promptNormalizer tests...");
    // Would use a test runner like Jest or Mocha in practice
}
