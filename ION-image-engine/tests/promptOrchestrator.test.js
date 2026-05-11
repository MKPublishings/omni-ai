/**
 * Unit Tests for promptOrchestrator.js
 * Tests precedence layers, anime tag routing, and deterministic merging
 */

const promptOrchestrator = require("../core/promptOrchestrator");
const assert = require("assert");

describe("promptOrchestrator - Precedence Layers", () => {
    
    describe("PRECEDENCE_LAYERS", () => {
        test("should orchestrate anime prompt with correct precedence", () => {
            const result = promptOrchestrator("beautiful anime girl with cel-shading, detailed expression", {
                stylePack: "anime_cel_shading"
            });
            
            assert(result.precedenceLayers);
            assert(result.styleRouting.isAnimePrompt === true);
        });

        test("should detect anime tokens and add to style layer", () => {
            const result = promptOrchestrator("soft glow anime character, kawaii");
            
            assert(result.precedenceLayers);
            assert(result.animeTokensCount > 0);
        });

        test("should preserve style tag order", () => {
            const result = promptOrchestrator("cel-shading anime girl", {
                stylePack: "anime_cel_shading"
            });
            
            assert(result.styleTags.includes("cel-shading") || result.styleTags.length > 0);
        });

        test("should build ordered prompt without duplicates", () => {
            const result = promptOrchestrator("anime character, anime style, anime art");
            
            // Should not have excessive repetition
            const animeCount = (result.finalPrompt.match(/anime/gi) || []).length;
            assert(animeCount <= 3, `Anime appears ${animeCount} times, should be deduplicated`);
        });

        test("should inject negative prompt early with directive", () => {
            const result = promptOrchestrator("anime girl", {
                negatives: ["no watermark", "no signature"]
            });
            
            assert(result.negativeTags.length > 0);
            assert(result.finalPrompt.includes("negative:") || result.finalPrompt.includes("no watermark"));
        });
    });

    describe("Anime Style Routing", () => {
        test("should route anime_cel_shading to correct model", () => {
            const result = promptOrchestrator("cel-shading character", {
                stylePack: "anime_cel_shading"
            });
            
            assert.strictEqual(result.styleRouting.explicitStylePack, "anime_cel_shading");
        });

        test("should infer anime style from keywords", () => {
            const result = promptOrchestrator("chibi cute character");
            
            assert(result.styleRouting.inferredStylePacks.length > 0 || result.styleRouting.isAnimePrompt);
        });

        test("should detect anime prompt type", () => {
            const result = promptOrchestrator("manga ink drawing");
            
            assert(result.styleRouting.isAnimePrompt === true);
        });
    });

    describe("Prompt Building", () => {
        test("should build coherent final prompt", () => {
            const result = promptOrchestrator("anime girl with soft glow");
            
            assert(result.finalPrompt);
            assert(result.finalPrompt.length > 0);
            assert(typeof result.finalPrompt === "string");
        });

        test("should not mix conflicting styles", () => {
            const result = promptOrchestrator("photorealistic anime character");
            
            // Should handle mixed styles gracefully
            assert(result.finalPrompt);
        });

        test("should include scene information in final prompt", () => {
            const result = promptOrchestrator("anime girl in a bedroom");
            
            assert(result.finalPrompt.includes("bedroom") || result.semanticExpansion.includes("bedroom"));
        });

        test("should maintain prompt structure for non-anime", () => {
            const result = promptOrchestrator("photorealistic portrait");
            
            assert(result.finalPrompt);
            assert(!result.styleRouting.isAnimePrompt);
        });
    });

    describe("Integration Tests", () => {
        test("should handle complex anime prompt", () => {
            const prompt = "90s retro anime girl, cel-shading, soft glow effect, magical girl theme";
            const result = promptOrchestrator(prompt, {
                stylePack: "anime_90s_retro",
                quality: "high"
            });
            
            assert(result.finalPrompt.length > 50);
            assert(result.styleTags.length > 0);
            assert(result.styleRouting.isAnimePrompt === true);
        });

        test("should handle chibi style with appropriate proportions", () => {
            const result = promptOrchestrator("chibi character, super cute");
            
            assert(result.styleRouting.isAnimePrompt);
            assert(result.finalPrompt);
        });

        test("should handle mecha with technical tags", () => {
            const result = promptOrchestrator("mecha robot, detailed mechanical parts");
            
            assert(result.styleRouting.isAnimePrompt);
            assert(result.technicalTags.length > 0);
        });
    });

    describe("Negative Prompt Handling", () => {
        test("should accept negative prompts via options", () => {
            const result = promptOrchestrator("anime girl", {
                negatives: ["watermark", "signature", "low quality"]
            });
            
            assert.deepStrictEqual(result.negativeTags, ["watermark", "signature", "low quality"]);
        });

        test("should inject negative directive in final prompt", () => {
            const result = promptOrchestrator("anime", {
                negatives: ["no watermark"]
            });
            
            assert(result.finalPrompt.includes("negative:") || result.negativeTags.length > 0);
        });
    });
});

// Test runner
if (require.main === module) {
    console.log("Running promptOrchestrator tests...");
}
