const stylePacks = require("./stylePacks");
const visualIntelligence = require("./visualIntelligence");
const { buildLawPromptDirectives, applyLawsToVisualInfluence } = require("./imageLawBridge");
const { normalizePromptLanguage, extractAnimeTokens } = require("./promptNormalizer");
const tokenizer = require("../utils/tokenizer");
const logger = require("../utils/logger");

/**
 * Precedence Layer System for prompt construction
 * Ensures consistent tag ordering and priority:
 * 1. Subject (user's primary request)
 * 2. Style (anime, art style, aesthetic)
 * 3. Quality (technical tags, composition)
 * 4. Negative (exclusions - injected early for sampler awareness)
 */
const PRECEDENCE_LAYERS = {
    SUBJECT: 1,      // What the user is asking for (character, scene, etc.)
    STYLE: 2,        // How it should look (anime, cinematic, etc.)
    QUALITY: 3,      // Technical quality and composition tags
    NEGATIVE: 4,     // What to exclude (appended but with sampler directive)
    LAW: 0           // Laws override everything (highest priority)
};

/**
 * Categorize a tag into a precedence layer
 */
function getTagPrecedence(tag) {
    if (!tag) return PRECEDENCE_LAYERS.QUALITY;
    
    const lower = String(tag).toLowerCase();
    
    // Law tags
    if (lower.includes("law") || lower.includes("constraint")) {
        return PRECEDENCE_LAYERS.LAW;
    }
    
    // Negative tags
    if (lower.includes("negative:") || lower.startsWith("no ") || lower.startsWith("without ")) {
        return PRECEDENCE_LAYERS.NEGATIVE;
    }
    
    // Style tags (anime, art style, aesthetic)
    if (/anime|manga|cel|shading|watercolor|photorealistic|cinematic|stylized|illustration|glow|pixel|sketch|painting/.test(lower)) {
        return PRECEDENCE_LAYERS.STYLE;
    }
    
    // Quality/technical tags
    if (/quality|sharp|detail|smooth|clear|bright|dark|contrast|lighting|composition|framing/.test(lower)) {
        return PRECEDENCE_LAYERS.QUALITY;
    }
    
    // Default to quality
    return PRECEDENCE_LAYERS.QUALITY;
}

/**
 * Build precedence-ordered prompt by layer
 */
function buildPrecedenceOrderedPrompt(layers) {
    const ordered = [];
    
    // Add in precedence order
    [PRECEDENCE_LAYERS.LAW, PRECEDENCE_LAYERS.SUBJECT, PRECEDENCE_LAYERS.STYLE, PRECEDENCE_LAYERS.QUALITY, PRECEDENCE_LAYERS.NEGATIVE]
        .forEach(priority => {
            if (layers[priority] && layers[priority].length > 0) {
                ordered.push(...layers[priority]);
            }
        });
    
    return ordered;
}

function inferSceneDescription(prompt) {
    const lower = String(prompt || "").toLowerCase();

    if (lower.includes("park")) {
        return "park environment matching the prompt, natural landscape continuity";
    }
    if (lower.includes("bedroom") || lower.includes("room")) {
        return "cozy interior, detailed furniture, realistic lighting";
    }
    if (lower.includes("forest")) {
        return "dense trees, atmospheric fog, grounded natural lighting";
    }
    if (lower.includes("city")) {
        return "urban environment, buildings, grounded textures, depth and perspective";
    }

    return "";
}

function inferTimeIntent(prompt) {
    const lower = String(prompt || "").toLowerCase();

    if (/(bedroom|room|office|studio|kitchen|indoor|interior)/.test(lower)) return "indoor";
    if (/(night|midnight|starlight|starry|nighttime)/.test(lower)) return "night";
    if (/(sunset|golden hour|dusk|twilight)/.test(lower)) return "sunset";
    if (/(day|daytime|sunlight|morning|noon|afternoon)/.test(lower)) return "day";

    return "neutral";
}

function buildTimeDirective(intent) {
    if (intent === "night") return "nighttime scene when appropriate, coherent low-light rendering";
    if (intent === "sunset") return "sunset lighting, warm sky tones";
    if (intent === "day") return "daytime lighting, natural sunlight, clear atmosphere";
    if (intent === "indoor") return "interior lighting setup, practical lights, no night sky elements unless requested";
    return "";
}

function buildStrictPromptDirective() {
    return "strict prompt fidelity: include only elements explicitly requested by the user; do not add extra subjects, characters, objects, text, logos, or overlays";
}

function inferContextTags(prompt) {
    const lower = String(prompt || "").toLowerCase();
    const tags = [];

    if (/(headshot|face|selfie)/.test(lower)) {
        tags.push("subject framing", "detailed facial rendering");
    }
    if (/(landscape|panorama|wide shot|vista)/.test(lower)) {
        tags.push("wide-angle composition", "depth layering");
    }
    if (/(close up|close-up|macro|detail shot)/.test(lower)) {
        tags.push("macro detail focus");
    }
    if (/(rain|storm|wet|drizzle|thunder)/.test(lower)) {
        tags.push("rain-soaked surfaces", "atmospheric moisture");
    }
    if (/(snow|winter|frost|blizzard)/.test(lower)) {
        tags.push("cold ambient haze", "snow particle detail");
    }
    if (/(vintage|retro|film|analog)/.test(lower)) {
        tags.push("subtle film grain", "cinematic color grading");
    }
    if (/(horror|haunted|scary|ominous)/.test(lower)) {
        tags.push("ominous atmosphere", "deep shadow sculpting");
    }
    if (/(cute|whimsical|playful)/.test(lower)) {
        tags.push("playful color harmony", "soft expressive lighting");
    }
    if (/(fantasy|dragon|wizard|magic|mythic)/.test(lower)) {
        tags.push("epic fantasy mood", "mythic visual language");
    }

    return [...new Set(tags)];
}

module.exports = function promptOrchestrator(userPrompt, options = {}) {
    const promptNormalization = normalizePromptLanguage(userPrompt);
    const normalizedPrompt = promptNormalization.cleanedPrompt || String(userPrompt || "");
    const tokens = tokenizer(normalizedPrompt);
    const isAnimePrompt = promptNormalization.isAnimePrompt || false;
    const animeTokens = promptNormalization.animeTokens || [];

    const base = {
        userPrompt: normalizedPrompt,
        tokens,
        promptNormalization,
        semanticExpansion: "",
        technicalTags: [],
        styleTags: [],
        styleRouting: {
            explicitStylePack: "",
            inferredStylePacks: [],
            matchedKeywords: []
        },
        lawTags: [],
        lawInfluence: {
            ids: [],
            palette: [],
            geometry: [],
            motion: [],
            symbols: []
        },
        negativeTags: [],
        precedenceLayers: {},
        finalPrompt: ""
    };

    const sceneInsights = visualIntelligence.inferScene(normalizedPrompt);
    const sceneDescription = inferSceneDescription(normalizedPrompt) || sceneInsights.description;
    const timeDirective = buildTimeDirective(inferTimeIntent(normalizedPrompt));
    const strictDirective = buildStrictPromptDirective();
    const stylePackName = options.stylePack || "";
    const stylePack = stylePacks.getStylePack(stylePackName);
    const inferredStyle = stylePacks.inferStylePacks(normalizedPrompt, {
        maxPacks: Number.isFinite(options.maxAutoStyles) ? options.maxAutoStyles : 2
    });
    const contextTags = inferContextTags(normalizedPrompt);

    // Build precedence layers
    const precedenceLayers = {
        [PRECEDENCE_LAYERS.SUBJECT]: [normalizedPrompt, sceneDescription, timeDirective].filter(Boolean),
        [PRECEDENCE_LAYERS.STYLE]: [],
        [PRECEDENCE_LAYERS.QUALITY]: [],
        [PRECEDENCE_LAYERS.LAW]: [],
        [PRECEDENCE_LAYERS.NEGATIVE]: []
    };

    // Add explicit anime tokens to style layer with preserved ordering
    if (isAnimePrompt && animeTokens.length > 0) {
        precedenceLayers[PRECEDENCE_LAYERS.STYLE].push(...animeTokens.map(t => t.canonical));
    }

    // Add style tags (prefer explicit pack, then inferred)
    const styleTags = [...new Set([...(stylePack.tags || []), ...(inferredStyle.tags || [])])];
    precedenceLayers[PRECEDENCE_LAYERS.STYLE].push(...styleTags);

    // Add quality/technical tags
    precedenceLayers[PRECEDENCE_LAYERS.QUALITY].push(...contextTags);
    precedenceLayers[PRECEDENCE_LAYERS.QUALITY].push(strictDirective);

    // Add law tags (highest priority)
    const lawTags = buildLawPromptDirectives(options.laws);
    if (lawTags && lawTags.length > 0) {
        precedenceLayers[PRECEDENCE_LAYERS.LAW].push(...lawTags);
    }

    // Build ordered tags array
    const orderedTags = buildPrecedenceOrderedPrompt(precedenceLayers);
    
    // Remove duplicates while preserving order
    const finalTags = [];
    const seen = new Set();
    for (const tag of orderedTags) {
        const key = String(tag).toLowerCase().trim();
        if (key && !seen.has(key)) {
            finalTags.push(tag);
            seen.add(key);
        }
    }

    // Build final prompt: ordered tags, then negative prompt with explicit directive
    let finalPrompt = finalTags.filter(Boolean).join(", ");

    // Inject negative prompt with explicit directive for sampler (moved earlier for model awareness)
    const negativeDirective = options.negatives && options.negatives.length > 0 
        ? `negative: ${options.negatives.join(", ")}`
        : "";

    if (negativeDirective) {
        finalPrompt = `${finalPrompt}, ${negativeDirective}`;
    }

    const lawInfluence = applyLawsToVisualInfluence(options.laws);

    const orchestrated = {
        ...base,
        precedenceLayers,
        semanticExpansion: precedenceLayers[PRECEDENCE_LAYERS.SUBJECT].join(", "),
        technicalTags: precedenceLayers[PRECEDENCE_LAYERS.QUALITY],
        styleTags,
        styleRouting: {
            explicitStylePack: stylePackName || "",
            inferredStylePacks: inferredStyle.packIds || [],
            matchedKeywords: inferredStyle.matchedKeywords || [],
            isAnimePrompt,
            animeTokensCount: animeTokens.length
        },
        lawTags,
        lawInfluence,
        negativeTags: options.negatives || [],
        finalPrompt
    };

    logger.info("Orchestrated prompt with precedence layers:", {
        layers: {
            law: precedenceLayers[PRECEDENCE_LAYERS.LAW].length,
            subject: precedenceLayers[PRECEDENCE_LAYERS.SUBJECT].length,
            style: precedenceLayers[PRECEDENCE_LAYERS.STYLE].length,
            quality: precedenceLayers[PRECEDENCE_LAYERS.QUALITY].length,
            negative: precedenceLayers[PRECEDENCE_LAYERS.NEGATIVE].length
        },
        isAnime: isAnimePrompt,
        finalPromptLength: finalPrompt.length
    });
    
    return orchestrated;
};
