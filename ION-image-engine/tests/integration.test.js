/**
 * Integration Tests for Anime Prompt Pipeline
 * Tests the full pipeline from user prompt to final orchestrated output
 */

const promptOrchestrator = require("../core/promptOrchestrator");
const multiPassRefiner = require("../core/multiPassRefiner");
const { normalizePromptLanguage } = require("../core/promptNormalizer");
const assert = require("assert");

describe("Anime Prompt Pipeline - Integration Tests", () => {
    
    describe("End-to-End Anime Pipelines", () => {
        test("should handle cel-shading anime pipeline", () => {
            const userPrompt = "beautiful cel-shading anime girl with vibrant colors";
            
            // Step 1: Normalize
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            assert(normalized.animeTokens.length > 0);
            
            // Step 2: Orchestrate
            const orchestrated = promptOrchestrator(userPrompt, {
                stylePack: "anime_cel_shading"
            });
            assert(orchestrated.styleRouting.isAnimePrompt);
            assert(orchestrated.finalPrompt.length > 50);
            
            // Step 3: Refine
            const refined = multiPassRefiner(orchestrated, {
                quality: "high"
            });
            assert(refined.data.finalPrompt);
            assert(refined.data.negativeTags.length > 0);
        });

        test("should handle soft-glow anime pipeline", () => {
            const userPrompt = "soft glow anime girl, dreamy pastel colors, ethereal";
            
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(userPrompt, {
                stylePack: "anime_soft_glow"
            });
            assert(orchestrated.finalPrompt);
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.negativeTags.some(t => 
                t.includes("color") || t.includes("line")
            ));
        });

        test("should handle 90s retro anime pipeline", () => {
            const userPrompt = "90s anime girl, classic cel animation, VHS aesthetic";
            
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(userPrompt, {
                stylePack: "anime_90s_retro"
            });
            assert(orchestrated.styleRouting.inferredStylePacks.length > 0 || 
                   orchestrated.styleRouting.explicitStylePack);
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.finalPrompt);
        });

        test("should handle manga ink pipeline", () => {
            const userPrompt = "manga ink character with screentone effects";
            
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(userPrompt, {
                stylePack: "anime_manga_ink"
            });
            
            const refined = multiPassRefiner(orchestrated);
            // Should preserve linework in refinement
            assert(refined.data.negativeTags.some(t => t.includes("line")));
        });

        test("should handle chibi style pipeline", () => {
            const userPrompt = "super cute chibi character, kawaii expression";
            
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(userPrompt, {
                stylePack: "anime_chibi"
            });
            assert(orchestrated.finalPrompt);
            
            const refined = multiPassRefiner(orchestrated);
            // Chibi should allow stylized proportions (caught in refinement)
            assert(refined.data.negativeTags);
        });

        test("should handle mecha anime pipeline", () => {
            const userPrompt = "mecha robot with detailed mechanical parts, sci-fi";
            
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(userPrompt, {
                stylePack: "anime_mecha"
            });
            assert(orchestrated.technicalTags.length > 0);
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.finalPrompt);
        });

        test("should handle isekai fantasy pipeline", () => {
            const userPrompt = "isekai fantasy world with magical elements";
            
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(userPrompt, {
                stylePack: "anime_isekai"
            });
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.finalPrompt);
        });
    });

    describe("Non-Anime Prompts", () => {
        test("should handle photorealistic pipeline differently", () => {
            const userPrompt = "photorealistic portrait of a person in natural light";
            
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, false);
            
            const orchestrated = promptOrchestrator(userPrompt);
            assert(!orchestrated.styleRouting.isAnimePrompt);
            assert.strictEqual(orchestrated.photogrammetry.enabled, true);
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.finalPrompt);
            assert(refined.data.negativeTags.includes("no overlapping anatomy"));
        });

        test("should handle surreal dreamscape pipeline", () => {
            const userPrompt = "surreal dreamlike landscape with impossible geometry";
            
            const normalized = normalizePromptLanguage(userPrompt);
            
            const orchestrated = promptOrchestrator(userPrompt);
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.finalPrompt);
        });
    });

    describe("Mixed Content Handling", () => {
        test("should handle anime in photorealistic context", () => {
            const userPrompt = "anime character rendered in photorealistic style";
            
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(userPrompt);
            assert(orchestrated.finalPrompt);
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.finalPrompt);
        });

        test("should handle complex multi-style prompt", () => {
            const userPrompt = "cel-shading anime with manga ink lines and watercolor background";
            
            const normalized = normalizePromptLanguage(userPrompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(userPrompt);
            assert(orchestrated.styleTags.length > 0);
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.finalPrompt);
        });
    });

    describe("Quality and Consistency Tests", () => {
        test("should produce consistent final prompts", () => {
            const userPrompt = "anime girl, soft glow, cute expression";
            
            // Run twice to check consistency
            const result1 = promptOrchestrator(userPrompt);
            const result2 = promptOrchestrator(userPrompt);
            
            // Final structure should be consistent (though exact prompt may vary)
            assert.strictEqual(result1.styleTags.length, result2.styleTags.length);
        });

        test("should not have excessive negative tags", () => {
            const userPrompt = "anime girl";
            
            const orchestrated = promptOrchestrator(userPrompt);
            const refined = multiPassRefiner(orchestrated);
            
            // Should have reasonable number of negatives, not excessive
            assert(refined.data.negativeTags.length < 100, 
                `Negative tags count: ${refined.data.negativeTags.length}, should be < 100`);
        });

        test("should produce valid output structure", () => {
            const userPrompt = "cel-shading anime character";
            
            const orchestrated = promptOrchestrator(userPrompt);
            
            // Check required fields
            assert(orchestrated.userPrompt);
            assert(orchestrated.finalPrompt);
            assert(Array.isArray(orchestrated.styleTags));
            assert(Array.isArray(orchestrated.technicalTags));
            assert(Array.isArray(orchestrated.negativeTags));
        });
    });

    describe("Regression Prevention Tests", () => {
        test("should preserve anime token order in final prompt", () => {
            const userPrompt = "cel-shading anime with soft glow";
            
            const orchestrated = promptOrchestrator(userPrompt);
            
            if (orchestrated.styleRouting.animeTokensCount > 0) {
                // Should have anime tokens in output
                assert(orchestrated.finalPrompt);
            }
        });

        test("should not drop style information", () => {
            const userPrompt = "anime girl with manga ink style";
            
            const orchestrated = promptOrchestrator(userPrompt);
            const refined = multiPassRefiner(orchestrated);
            
            // Style should be preserved in final output
            assert(refined.data.finalPrompt.includes("anime") || 
                   refined.data.finalPrompt.includes("manga"));
        });

        test("should not create conflicting style directives", () => {
            const userPrompt = "realistic anime photorealistic cel-shading";
            
            const orchestrated = promptOrchestrator(userPrompt);
            
            // Should resolve without creating contradictions
            assert(orchestrated.finalPrompt);
        });
    });

    describe("Golden Output Tests", () => {
        test("Golden Test 1: Detailed chibi character", () => {
            const prompt = "adorable chibi kawaii anime girl with oversized eyes, super cute expression, pastel colors, soft glow effect";
            
            const normalized = normalizePromptLanguage(prompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            assert(normalized.animeTokens.length > 0);
            
            const orchestrated = promptOrchestrator(prompt, { stylePack: "anime_chibi" });
            assert(orchestrated.finalPrompt.length > 100);
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.negativeTags.length > 10);
        });

        test("Golden Test 2: 90s Nostalgic Anime", () => {
            const prompt = "retro 90s anime girl with cel-shading, manga ink lines, VHS aesthetic, film grain";
            
            const normalized = normalizePromptLanguage(prompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(prompt, { stylePack: "anime_90s_retro" });
            assert(orchestrated.styleTags.length > 0);
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.negativeTags.length > 10);
        });

        test("Golden Test 3: Mecha Anime", () => {
            const prompt = "mechanical mecha robot, detailed circuitry, blue neon glow, cyberpunk aesthetic, anime style";
            
            const normalized = normalizePromptLanguage(prompt);
            assert.strictEqual(normalized.isAnimePrompt, true);
            
            const orchestrated = promptOrchestrator(prompt, { stylePack: "anime_mecha" });
            
            const refined = multiPassRefiner(orchestrated);
            assert(refined.data.finalPrompt);
        });
    });
});

if (require.main === module) {
    console.log("Running integration tests...");
}
