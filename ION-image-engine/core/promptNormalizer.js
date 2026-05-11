const COMMON_WORD_FIXES = {
    anmie: "anime",
    animee: "anime",
    cinamatic: "cinematic",
    cinmatic: "cinematic",
    realisitc: "realistic",
    relistic: "realistic",
    phootorealistic: "photorealistic",
    photorealsitic: "photorealistic",
    watercolorr: "watercolor",
    illustraton: "illustration",
    ilustration: "illustration",
    portriat: "headshot",
    potrait: "headshot",
    backgroud: "background",
    enviroment: "environment",
    enviornment: "environment",
    lighitng: "lighting",
    lightng: "lighting",
    lightinng: "lighting",
    dramtic: "dramatic",
    detialed: "detailed",
    beautifull: "beautiful",
    aestetic: "aesthetic",
    aesthethic: "aesthetic",
    surreall: "surreal",
    pixle: "pixel",
    cyberpnk: "cyberpunk",
    medival: "medieval",
    fanstasy: "fantasy",
    fantacy: "fantasy",
    nite: "night",
    scifi: "sci-fi",
    scyfi: "sci-fi",
    phto: "photo",
    imag: "image",
    pic: "picture",
    plz: "please",
    pls: "please",
    u: "you"
};

const ANIME_TOKEN_WHITELIST = {
    // Multi-word anime styles that should be preserved
    "cel-shading": "cel-shading",
    "cel shading": "cel-shading",
    "soft-glow": "soft-glow",
    "soft glow": "soft-glow",
    "chibi style": "chibi",
    "chibi": "chibi",
    "shoujo": "shoujo",
    "shounen": "shounen",
    "shonen": "shounen",
    "shojo": "shoujo",
    "isekai": "isekai",
    "mecha": "mecha",
    "cyberpunk": "cyberpunk",
    "steampunk": "steampunk",
    "slice of life": "slice-of-life",
    "slice-of-life": "slice-of-life",
    "magical girl": "mahou-shoujo",
    "mahou-shoujo": "mahou-shoujo",
    "bishoujo": "bishoujo",
    "bishounen": "bishounen",
    "sakura-style": "sakura-style",
    "sakura style": "sakura-style",
    "watercolor anime": "watercolor-anime",
    "manga ink": "manga-ink",
    "manga-ink": "manga-ink",
    "doujinshi": "doujinshi",
    "neon-punk": "neon-punk",
    "synthwave": "synthwave",
    "vaporwave": "vaporwave",
    "80s anime": "80s-anime",
    "90s anime": "90s-anime",
    "2000s anime": "2000s-anime",
    "retro anime": "retro-anime",
    "modern anime": "modern-anime"
};

// Canonicalization rules: map variants/typos to canonical forms
const ANIME_CANONICALIZATION = {
    "cel": "cel-shading",
    "cg": "3dcg",
    "3d cg": "3dcg",
    "3d": "3dcg",
    "hand drawn": "hand-drawn",
    "handdrawn": "hand-drawn",
    "watercolour": "watercolor",
    "mangaka": "manga-style",
    "manga-style": "manga-style",
    "manga style": "manga-style",
    "anime style": "anime",
    "kawaii": "kawaii",
    "cute": "kawaii",
    "adorable": "kawaii",
    "girl": "shoujo",
    "boy": "shounen",
    "action": "action-anime"
};

// Japanese terms that should be preserved (UTF-8 compatible)
const JAPANESE_TERMS = {
    "sakura": "sakura",
    "kimono": "kimono",
    "shibuya": "shibuya",
    "harajuku": "harajuku",
    "tokyo": "tokyo",
    "nihongo": "nihongo",
    "kitsune": "kitsune",
    "tanuki": "tanuki",
    "oni": "oni",
    "yokai": "yokai"
};

const LEADING_INTENT_PATTERNS = [
    /^(please\s+)+/i,
    /^(can\s+you|could\s+you|would\s+you)\s+/i,
    /^(make|create|generate|draw|render)\s+(me\s+)?/i,
    /^(i\s+(want|need))\s+(an?\s+)?/i,
    /^(give\s+me)\s+/i
];

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyWordFixes(text) {
    let output = String(text || "");
    const correctionsApplied = [];

    for (const [misspelled, corrected] of Object.entries(COMMON_WORD_FIXES)) {
        const pattern = new RegExp(`\\b${escapeRegExp(misspelled)}\\b`, "gi");
        if (!pattern.test(output)) {
            continue;
        }

        output = output.replace(pattern, corrected);
        correctionsApplied.push({ from: misspelled, to: corrected });
    }

    return { output, correctionsApplied };
}

function normalizeWhitespaceAndPunctuation(text) {
    return String(text || "")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[\t\n\r]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\s*([,.;:!?])\s*/g, "$1 ")
        .replace(/\s+/g, " ")
        .trim();
}

function stripLeadingIntent(text) {
    let output = String(text || "").trim();

    for (let i = 0; i < 4; i += 1) {
        const before = output;
        for (const pattern of LEADING_INTENT_PATTERNS) {
            output = output.replace(pattern, "").trim();
        }
        if (before === output) {
            break;
        }
    }

    return output;
}

function compactRepeatedWords(text) {
    return String(text || "")
        .replace(/\b(\w+)(\s+\1\b)+/gi, "$1")
        .replace(/\b(of|the|a|an)\s+(of|the|a|an)\b/gi, "$1")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Extract and preserve anime tokens in their original order
 * This prevents the normalizer from breaking multi-word anime style names
 */
function extractAnimeTokens(text) {
    const tokens = [];
    let remaining = String(text || "");
    const normalized = remaining.toLowerCase();

    // Find all anime tokens (sorted by length descending to match longest first)
    const sortedWhitelist = Object.keys(ANIME_TOKEN_WHITELIST).sort((a, b) => b.length - a.length);

    for (const token of sortedWhitelist) {
        const pattern = new RegExp(`\\b${token}\\b`, "gi");
        if (pattern.test(normalized)) {
            // Extract the token and its canonical form
            tokens.push({
                original: token,
                canonical: ANIME_TOKEN_WHITELIST[token],
                found: true
            });
            remaining = remaining.replace(pattern, "");
        }
    }

    // Also check for canonicalization candidates
    const sortedCanonical = Object.keys(ANIME_CANONICALIZATION).sort((a, b) => b.length - a.length);
    for (const variant of sortedCanonical) {
        const pattern = new RegExp(`\\b${variant}\\b`, "gi");
        if (pattern.test(normalized)) {
            const canonical = ANIME_CANONICALIZATION[variant];
            // Only add if we don't already have this canonical form
            if (!tokens.find(t => t.canonical === canonical)) {
                tokens.push({
                    original: variant,
                    canonical: canonical,
                    found: true
                });
            }
            remaining = remaining.replace(pattern, "");
        }
    }

    return {
        animeTokens: tokens,
        remainingText: remaining.trim()
    };
}

/**
 * Preserve ordering and apply canonicalization to anime tokens
 */
function canonicalizeAnimeTokens(text) {
    const lower = String(text || "").toLowerCase();
    let result = text;

    // First pass: canonicalize anime whitelist entries
    for (const [variant, canonical] of Object.entries(ANIME_TOKEN_WHITELIST)) {
        if (variant === canonical) continue; // Skip identity mappings
        const pattern = new RegExp(`\\b${escapeRegExp(variant)}\\b`, "gi");
        result = result.replace(pattern, canonical);
    }

    // Second pass: canonicalize variants
    for (const [variant, canonical] of Object.entries(ANIME_CANONICALIZATION)) {
        const pattern = new RegExp(`\\b${escapeRegExp(variant)}\\b`, "gi");
        result = result.replace(pattern, canonical);
    }

    return result;
}

/**
 * Check if text contains anime-specific keywords
 */
function containsAnimeKeywords(text) {
    const lower = String(text || "").toLowerCase();
    return /\b(anime|manga|cel-shading|chibi|shoujo|shounen|mecha|sakura|kawaii|bishoujo|bishounen)\b/.test(lower) ||
           Object.keys(ANIME_TOKEN_WHITELIST).some(token => new RegExp(`\\b${token}\\b`, "i").test(text));
}

function toSentenceCase(text) {
    const source = String(text || "").trim();
    if (!source) return source;
    return source.charAt(0).toUpperCase() + source.slice(1);
}

function normalizePromptLanguage(prompt) {
    const input = String(prompt || "").trim();
    if (!input) {
        return {
            originalPrompt: input,
            cleanedPrompt: "",
            correctionsApplied: [],
            animeTokens: [],
            isAnimePrompt: false
        };
    }

    // Check if this is an anime prompt early
    const isAnimePrompt = containsAnimeKeywords(input);

    let cleanedPrompt = normalizeWhitespaceAndPunctuation(input);
    const { output, correctionsApplied } = applyWordFixes(cleanedPrompt);
    
    // Apply anime token canonicalization (before stripping intent)
    cleanedPrompt = canonicalizeAnimeTokens(output);
    
    cleanedPrompt = stripLeadingIntent(cleanedPrompt);
    cleanedPrompt = compactRepeatedWords(cleanedPrompt);
    
    // For anime prompts, preserve token order (only capitalize first letter)
    if (isAnimePrompt && cleanedPrompt) {
        cleanedPrompt = cleanedPrompt.charAt(0).toUpperCase() + cleanedPrompt.slice(1);
    } else {
        cleanedPrompt = toSentenceCase(cleanedPrompt);
    }

    // Extract anime tokens for use by orchestrator
    const { animeTokens } = extractAnimeTokens(cleanedPrompt);

    return {
        originalPrompt: input,
        cleanedPrompt,
        correctionsApplied,
        animeTokens,
        isAnimePrompt
    };
}

module.exports = {
    normalizePromptLanguage,
    extractAnimeTokens,
    canonicalizeAnimeTokens,
    containsAnimeKeywords,
    ANIME_TOKEN_WHITELIST,
    ANIME_CANONICALIZATION,
    JAPANESE_TERMS
};
