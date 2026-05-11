const negativeConfig = require("../config/negativeTags.json");
const logger = require("../utils/logger");

/**
 * Conflict detection and resolution for negative tags
 * Prevents mutually-exclusive negatives from canceling out each other
 */
const CONFLICT_MAP = {
    // Positive descriptors that shouldn't be negated if the user wants stylization
    "beautiful": ["ugly", "deformed", "grotesque"],
    "detailed": ["simplistic", "low detail"],
    "vibrant": ["dull", "washed out"],
    "smooth": ["rough", "gritty"],
    "artistic": ["photorealistic"],
    "stylized": ["photorealistic", "realistic"],
    "crisp": ["blurry", "soft"],
    "clean": ["dirty", "messy"]
};

/**
 * Detect conflicting negative tags and apply override rules
 * Returns deduplicated and conflict-resolved negative tag list
 */
function resolveConflicts(negativeTags, animeMode = false) {
    const resolved = [];
    const tagSet = new Set(negativeTags.map(t => String(t).toLowerCase().trim()));
    
    // For anime mode, prefer stylization over photorealism
    if (animeMode) {
        tagSet.delete("photorealistic");
        tagSet.delete("realistic");
        tagSet.delete("hyperrealistic");
    }
    
    // Convert back to array
    return Array.from(tagSet).filter(Boolean);
}

/**
 * Deduplicate negative tags while preserving order
 * Also detects and removes variant forms of the same concept
 */
function deduplicateNegativeTags(tags) {
    const unique = [];
    const normalized = new Set();
    
    for (const tag of tags) {
        const normalized_tag = String(tag).toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/^no\s+/i, "")
            .trim();
        
        if (!normalized_tag || normalized.has(normalized_tag)) {
            continue; // Skip if empty or duplicate
        }
        
        unique.push(tag);
        normalized.add(normalized_tag);
    }
    
    return unique;
}

/**
 * Apply anime-specific negatives when anime is detected
 */
function applyAnimeSpecificNegatives(promptData, isAnime = false) {
    if (!isAnime) return promptData.negativeTags || [];
    
    const animeNegatives = [];
    const negConfig = require("../prompts/negative_tags.json");
    
    // Add anime-specific artifact prevention
    if (negConfig.anime_specific_artifacts) {
        animeNegatives.push(...negConfig.anime_specific_artifacts);
    }
    if (negConfig.anime_linework) {
        animeNegatives.push(...negConfig.anime_linework);
    }
    if (negConfig.anime_color_issues) {
        animeNegatives.push(...negConfig.anime_color_issues);
    }
    if (negConfig.anime_hand_issues) {
        animeNegatives.push(...negConfig.anime_hand_issues);
    }
    if (negConfig.anime_hair) {
        animeNegatives.push(...negConfig.anime_hair);
    }
    if (negConfig.anime_body) {
        animeNegatives.push(...negConfig.anime_body);
    }
    if (negConfig.anime_background) {
        animeNegatives.push(...negConfig.anime_background);
    }
    
    return animeNegatives;
}

module.exports = function negativePrompting(promptData) {
    const userPrompt = String(promptData?.userPrompt || "").toLowerCase();
    const isAnimePrompt = promptData?.promptNormalization?.isAnimePrompt || false;
    let negativeTags = [...(promptData.negativeTags || [])];

    // Base negatives (mandatory exclusions)
    const baseNegatives = Array.isArray(negativeConfig.mandatory_exclusions) 
        ? [...negativeConfig.mandatory_exclusions] 
        : [];
    
    // Add category-based negatives
    const categoryNegatives = [];
    
    // Anatomical
    if (Array.isArray(negativeConfig.anatomical_errors)) {
        categoryNegatives.push(...negativeConfig.anatomical_errors);
    }
    
    // Face errors
    if (Array.isArray(negativeConfig.face_errors)) {
        categoryNegatives.push(...negativeConfig.face_errors);
    }
    
    // Composition
    if (Array.isArray(negativeConfig.composition_errors)) {
        categoryNegatives.push(...negativeConfig.composition_errors);
    }
    
    // Lighting
    if (Array.isArray(negativeConfig.lighting_errors)) {
        categoryNegatives.push(...negativeConfig.lighting_errors);
    }
    
    // Quality
    if (Array.isArray(negativeConfig.quality_errors)) {
        categoryNegatives.push(...negativeConfig.quality_errors);
    }
    
    // Watermarks/text
    if (Array.isArray(negativeConfig.watermark_and_text)) {
        categoryNegatives.push(...negativeConfig.watermark_and_text);
    }

    // Conditional environment suppression
    if (!userPrompt.includes("ocean") && !userPrompt.includes("sea") && !userPrompt.includes("beach")) {
        if (Array.isArray(negativeConfig.noOcean)) {
            categoryNegatives.push(...negativeConfig.noOcean);
        }
    }

    // Combine all negatives
    negativeTags.push(...baseNegatives);
    negativeTags.push(...categoryNegatives);
    
    // Apply anime-specific negatives if detected
    const animeNegatives = applyAnimeSpecificNegatives(promptData, isAnimePrompt);
    if (animeNegatives.length > 0) {
        negativeTags.push(...animeNegatives);
    }

    // Deduplicate and resolve conflicts
    negativeTags = deduplicateNegativeTags(negativeTags);
    negativeTags = resolveConflicts(negativeTags, isAnimePrompt);

    promptData.negativeTags = negativeTags;

    logger.info("Negative tags applied", {
        count: negativeTags.length,
        isAnime: isAnimePrompt,
        sampleTags: negativeTags.slice(0, 5)
    });
    
    return promptData;
};
