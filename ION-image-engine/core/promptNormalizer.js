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
            correctionsApplied: []
        };
    }

    let cleanedPrompt = normalizeWhitespaceAndPunctuation(input);
    const { output, correctionsApplied } = applyWordFixes(cleanedPrompt);
    cleanedPrompt = stripLeadingIntent(output);
    cleanedPrompt = compactRepeatedWords(cleanedPrompt);
    cleanedPrompt = toSentenceCase(cleanedPrompt);

    return {
        originalPrompt: input,
        cleanedPrompt,
        correctionsApplied
    };
}

module.exports = {
    normalizePromptLanguage
};
