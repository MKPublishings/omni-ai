const negativePrompting = require("./negativePrompting");
const sceneEnforcer = require("./sceneEnforcer");
const applyFreshness = require("./promptFreshness");
const logger = require("../utils/logger");
const qualityConfig = require("../config/qualityTags.json");

/**
 * Multi-Pass Refinement Strategy for Anime
 * 
 * For anime prompts, we reorder passes to protect linework:
 * 1. Linework First Pass - establish crisp line continuity
 * 2. Color Fill Pass - flat color blocks within lines
 * 3. Detail/Texture Pass - lighting, shadows, effects
 * 
 * This prevents over-smoothing and edge dissolution
 */

const PASS_TYPES = {
    LINEWORK: "linework",
    COLOR: "color",
    TEXTURE: "texture",
    SCENE: "scene",
    SEMANTIC: "semantic"
};

function inferTimeIntent(prompt) {
    const lower = String(prompt || "").toLowerCase();

    if (/(bedroom|room|office|studio|kitchen|indoor|interior)/.test(lower)) return "indoor";
    if (/(night|midnight|starlight|starry|nighttime)/.test(lower)) return "night";
    if (/(sunset|golden hour|dusk|twilight)/.test(lower)) return "sunset";
    if (/(day|daytime|sunlight|morning|noon|afternoon)/.test(lower)) return "day";

    return "neutral";
}

function promptRequestsPeople(prompt) {
    const lower = String(prompt || "").toLowerCase();
    return /\b(person|people|character|characters|man|woman|boy|girl|child|children|human|humans|crowd|selfie|face|worker|hiker|runner|couple|family|model|figure|silhouette|subject|pose|full[-\s]?body|upper[-\s]?body|half[-\s]?body|waist[-\s]?up)\b/.test(lower);
}

function detectAnimeStyle(data) {
    const prompt = String(data.userPrompt || "").toLowerCase();
    const isAnime = /anime|manga|cel|chibi|shoujo|shounen|kawaii|bishoujo/.test(prompt) ||
                    data.promptNormalization?.isAnimePrompt || false;
    
    const hasLinework = /linework|line|ink|manga|cel/.test(prompt);
    const isMinimalistic = /chibi|minimal|simple|cute/.test(prompt);
    
    return { isAnime, hasLinework, isMinimalistic };
}

/**
 * Linework Preservation Pass (for anime)
 * Adds directives to preserve crisp edges and line continuity
 */
function lineworkPreservationPass(data) {
    if (!data.promptNormalization?.isAnimePrompt) {
        return data;
    }
    
    const lineworkTags = [
        "crisp line continuity",
        "no line fragmentation",
        "continuous outlines",
        "sharp edge definition",
        "no line dissolution"
    ];
    
    data.technicalTags = [...(data.technicalTags || []), ...lineworkTags];
    return data;
}

/**
 * Color Block Pass (for anime)
 * Ensures flat color blocks are well-defined within linework
 */
function colorBlockPass(data) {
    if (!data.promptNormalization?.isAnimePrompt) {
        return data;
    }
    
    const colorTags = [
        "flat color blocks",
        "well-defined color boundaries",
        "no color bleeding across lines",
        "saturated colors",
        "clean color separation"
    ];
    
    data.technicalTags = [...(data.technicalTags || []), ...colorTags];
    return data;
}

/**
 * Detail and Texture Pass
 * Adds lighting, shadows, and texture details
 */
function detailTexturePass(data, qualityLevel) {
    const level = qualityLevel || "default";
    const tags = qualityConfig[level] || qualityConfig["default"] || [];
    data.technicalTags = [...(Array.isArray(data.technicalTags) ? data.technicalTags : []), ...tags];
    return data;
}

function applyStrictFidelityNegatives(data) {
    const prompt = String(data.userPrompt || "").toLowerCase();
    const negativeTags = [...(data.negativeTags || [])];
    const timeIntent = inferTimeIntent(prompt);
    const explicitlyRequestsNight = timeIntent === "night";

    if (!explicitlyRequestsNight && !prompt.includes("night")) {
        negativeTags.push("no starry sky", "no nighttime atmosphere unless requested");
    }

    if (!promptRequestsPeople(prompt)) {
        negativeTags.push("no people", "no characters", "no human subjects", "no headshots", "no crowd");
    }

    data.negativeTags = [...new Set(negativeTags)];
    return data;
}

function semanticExpansionPass(data) {
    // Already expanded in orchestrator; extend here if needed
    return data;
}

function technicalEnhancementPass(data, qualityLevel) {
    const level = qualityLevel || "default";
    const tags = qualityConfig[level] || qualityConfig["default"] || [];
    data.technicalTags = [...(Array.isArray(data.technicalTags) ? data.technicalTags : []), ...tags];
    return data;
}

module.exports = function multiPassRefiner(promptData, options = {}) {
    let data = {
        ...(promptData || {}),
        styleTags: Array.isArray(promptData?.styleTags) ? promptData.styleTags : [],
        technicalTags: Array.isArray(promptData?.technicalTags) ? promptData.technicalTags : [],
        lawTags: Array.isArray(promptData?.lawTags) ? promptData.lawTags : [],
        negativeTags: Array.isArray(promptData?.negativeTags) ? promptData.negativeTags : []
    };
    
    // Detect anime styling
    const { isAnime, hasLinework, isMinimalistic } = detectAnimeStyle(data);

    if (isAnime) {
        // Anime-optimized pass ordering: linework first, then color, then details
        
        // Pass 1: Linework preservation (highest priority for anime)
        if (hasLinework) {
            data = lineworkPreservationPass(data);
        }
        
        // Pass 2: Color block definition
        data = colorBlockPass(data);
        
        // Pass 3: Semantic expansion (already done in orchestrator, but ensure it's set)
        data = semanticExpansionPass(data);
        
        // Pass 4: Technical enhancement with quality level
        data = detailTexturePass(data, options.quality);
        
        // Pass 5: Negative prompting (anime-aware deduplication)
        data = negativePrompting(data);
        
        // Pass 6: Strict fidelity
        data = applyStrictFidelityNegatives(data);
        
        // Skip scene enforcement for minimalistic styles (chibi, etc.)
        if (!isMinimalistic) {
            data = sceneEnforcer(data);
        }
        
        logger.info("Multi-pass refiner (anime mode):", {
            hasLinework,
            isMinimalistic,
            technicalTagCount: data.technicalTags?.length || 0
        });
    } else {
        // Standard pass ordering for non-anime

        // Pass 1: semantic expansion
        data = semanticExpansionPass(data);

        // Pass 2: technical enhancement
        data = technicalEnhancementPass(data, options.quality);

        // Pass 3: negative prompting
        data = negativePrompting(data);

        // Pass 3b: strict fidelity negatives
        data = applyStrictFidelityNegatives(data);

        // Pass 4: scene enforcement
        data = sceneEnforcer(data);
    }

    // Build final prompt string
    let finalPrompt = [
        data.semanticExpansion,
        (data.lawTags || []).join(", "),
        (Array.isArray(data.styleTags) ? data.styleTags : []).join(", "),
        (Array.isArray(data.technicalTags) ? data.technicalTags : []).join(", ")
    ].filter(Boolean).join(", ");

    if (Array.isArray(data.negativeTags) && data.negativeTags.length) {
        finalPrompt = `${finalPrompt}, negative: ${data.negativeTags.join(", ")}`;
    }

    data.finalPrompt = finalPrompt;

    // Freshness options (seed, etc.)
    const finalOptions = applyFreshness(options);

    logger.info("Final refined prompt:", { 
        finalPromptLength: finalPrompt.length,
        isAnime,
        negativeTagCount: data.negativeTags?.length || 0
    });
    
    return { data, finalOptions };
};
