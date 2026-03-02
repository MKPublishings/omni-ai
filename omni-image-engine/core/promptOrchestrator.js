const stylePacks = require("./stylePacks");
const visualIntelligence = require("./visualIntelligence");
const { buildLawPromptDirectives, applyLawsToVisualInfluence } = require("./imageLawBridge");
const { normalizePromptLanguage } = require("./promptNormalizer");
const tokenizer = require("../utils/tokenizer");
const logger = require("../utils/logger");

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

    const semanticExpansion = [
        normalizedPrompt,
        sceneDescription,
        timeDirective
    ].filter(Boolean).join(", ");

    const lawTags = buildLawPromptDirectives(options.laws);
    const lawInfluence = applyLawsToVisualInfluence(options.laws);
    const styleTags = [...new Set([...(stylePack.tags || []), ...(inferredStyle.tags || [])])];
    const technicalTags = [...contextTags, strictDirective];

    const finalPrompt = [
        semanticExpansion,
        lawTags.join(", "),
        styleTags.join(", "),
        technicalTags.join(", ")
    ].filter(Boolean).join(", ");

    const orchestrated = {
        ...base,
        semanticExpansion,
        technicalTags,
        styleTags,
        styleRouting: {
            explicitStylePack: stylePackName || "",
            inferredStylePacks: inferredStyle.packIds || [],
            matchedKeywords: inferredStyle.matchedKeywords || []
        },
        lawTags,
        lawInfluence,
        negativeTags: [],
        finalPrompt
    };

    logger.info("Orchestrated prompt:", orchestrated.finalPrompt);
    return orchestrated;
};
