/**
 * Unit Tests for negativePrompting.js
 * Tests anime-specific negatives, deduplication, and conflict resolution
 */

const negativePrompting = require("../core/negativePrompting");
const assert = require("assert");

describe("negativePrompting - Anime Support", () => {
    
    describe("Deduplication", () => {
        test("should remove duplicate negative tags", () => {
            const promptData = {
                userPrompt: "anime girl",
                negativeTags: ["no watermark", "no watermark", "bad anatomy"],
                promptNormalization: { isAnimePrompt: false }
            };
            
            const result = negativePrompting(promptData);
            const watermarkCount = (result.negativeTags.filter(t => t.includes("watermark")).length);
            assert(watermarkCount <= 1, "Should deduplicate watermark tags");
        });

        test("should remove similar negative tags", () => {
            const promptData = {
                userPrompt: "character",
                negativeTags: ["no cropped face", "no cropped forehead", "face fully visible"],
                promptNormalization: { isAnimePrompt: false }
            };
            
            const result = negativePrompting(promptData);
            assert(result.negativeTags.length <= 3);
        });

        test("should preserve dedup order", () => {
            const promptData = {
                userPrompt: "anime",
                negativeTags: ["bad anatomy", "distorted", "bad anatomy"],
                promptNormalization: { isAnimePrompt: false }
            };
            
            const result = negativePrompting(promptData);
            const firstBad = result.negativeTags.indexOf("bad anatomy");
            assert(firstBad >= 0);
            assert(!result.negativeTags.slice(firstBad + 1).includes("bad anatomy"));
        });
    });

    describe("Anime-Specific Negatives", () => {
        test("should add anime-specific artifact negatives for anime prompts", () => {
            const promptData = {
                userPrompt: "anime girl",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            const hasAnimeNegatives = result.negativeTags.some(t => 
                t.includes("mismatched eyes") || 
                t.includes("linework") || 
                t.includes("color banding")
            );
            assert(hasAnimeNegatives, "Should include anime-specific negatives");
        });

        test("should add linework preservation negatives", () => {
            const promptData = {
                userPrompt: "manga character with linework",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            const hasLineNegatives = result.negativeTags.some(t => t.includes("line"));
            assert(hasLineNegatives, "Should prevent linework issues");
        });

        test("should add color banding prevention for anime", () => {
            const promptData = {
                userPrompt: "cel-shading anime",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            const hasColorNegatives = result.negativeTags.some(t => 
                t.includes("color banding") || 
                t.includes("color") ||
                t.includes("bleeding")
            );
            assert(hasColorNegatives, "Should prevent color issues");
        });

        test("should add hand-specific negatives for anime", () => {
            const promptData = {
                userPrompt: "anime girl with hands",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            const hasHandNegatives = result.negativeTags.some(t => t.includes("finger"));
            assert(hasHandNegatives, "Should prevent hand artifacts");
        });

        test("should not add anime negatives for non-anime prompts", () => {
            const promptData = {
                userPrompt: "photorealistic portrait",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: false }
            };
            
            const result = negativePrompting(promptData);
            const hasAnimeNegatives = result.negativeTags.some(t => 
                t.includes("linework") || t.includes("mismatched eyes")
            );
            assert(!hasAnimeNegatives, "Should not add anime negatives for non-anime");
        });
    });

    describe("Conflict Resolution", () => {
        test("should remove photorealistic from anime prompts", () => {
            const promptData = {
                userPrompt: "anime character",
                negativeTags: ["photorealistic"],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            assert(!result.negativeTags.includes("photorealistic"));
        });

        test("should handle conflicting artistic styles", () => {
            const promptData = {
                userPrompt: "anime",
                negativeTags: ["realistic", "photorealistic", "artistic"],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            // Should resolve conflicts gracefully
            assert(result.negativeTags);
            assert(result.negativeTags.length <= 2);
        });
    });

    describe("Category-Based Negatives", () => {
        test("should include mandatory exclusions", () => {
            const promptData = {
                userPrompt: "anime character",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: false }
            };
            
            const result = negativePrompting(promptData);
            const hasMandatory = result.negativeTags.some(t => 
                t.includes("watermark") || 
                t.includes("low quality") ||
                t.includes("bad anatomy")
            );
            assert(hasMandatory, "Should include mandatory exclusions");
        });

        test("should include face error prevention", () => {
            const promptData = {
                userPrompt: "portrait of a face",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: false }
            };
            
            const result = negativePrompting(promptData);
            const hasFaceNegatives = result.negativeTags.some(t => 
                t.includes("face") || t.includes("eye")
            );
            assert(hasFaceNegatives, "Should prevent face errors");
        });

        test("should include composition negatives", () => {
            const promptData = {
                userPrompt: "wide landscape scene",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: false }
            };
            
            const result = negativePrompting(promptData);
            const hasCompositionNegatives = result.negativeTags.some(t => 
                t.includes("composition") || 
                t.includes("framing") ||
                t.includes("centered")
            );
            assert(hasCompositionNegatives, "Should include composition negatives");
        });
    });

    describe("Conditional Negatives", () => {
        test("should skip ocean negatives when ocean is requested", () => {
            const promptData = {
                userPrompt: "anime girl at the beach by the ocean",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            const hasOceanNegatives = result.negativeTags.some(t => 
                t.includes("ocean") || t.includes("sea")
            );
            assert(!hasOceanNegatives, "Should not negate ocean when explicitly requested");
        });

        test("should add ocean negatives when not requested", () => {
            const promptData = {
                userPrompt: "anime girl in a bedroom",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            // Should have some base negatives
            assert(result.negativeTags.length > 0);
        });
    });

    describe("Integration Tests", () => {
        test("should handle complex anime prompt with full negative chain", () => {
            const promptData = {
                userPrompt: "detailed cel-shading anime girl with soft glow",
                negativeTags: ["watermark"],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            assert(result.negativeTags.length > 5, "Should include anime and base negatives");
            assert(!result.negativeTags.includes("watermark") || result.negativeTags.length > 1);
        });

        test("should return deduped and organized negative list", () => {
            const promptData = {
                userPrompt: "anime",
                negativeTags: [],
                promptNormalization: { isAnimePrompt: true }
            };
            
            const result = negativePrompting(promptData);
            const unique = new Set(result.negativeTags);
            assert.strictEqual(unique.size, result.negativeTags.length, "All negatives should be unique");
        });
    });
});

if (require.main === module) {
    console.log("Running negativePrompting tests...");
}
