const styleConfig = require("../config/styleConfig.json");

function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeInput(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function keywordMatchesPrompt(normalizedPrompt, keyword) {
    const normalizedKeyword = normalizeInput(keyword);
    if (!normalizedKeyword) return false;

    if (normalizedKeyword.includes(" ")) {
        return normalizedPrompt.includes(normalizedKeyword);
    }

    const pattern = new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`, "i");
    return pattern.test(normalizedPrompt);
}

function inferStylePacks(prompt, options = {}) {
    const maxPacks = Number.isFinite(options.maxPacks) ? options.maxPacks : 2;
    const normalizedPrompt = normalizeInput(prompt);

    if (!normalizedPrompt) {
        return {
            packIds: [],
            packs: [],
            tags: [],
            matchedKeywords: []
        };
    }

    const scored = Object.entries(styleConfig.packs || {})
        .map(([packId, pack]) => {
            const keywords = Array.isArray(pack.keywords) ? pack.keywords : [];
            const matchedKeywords = keywords.filter((keyword) => keywordMatchesPrompt(normalizedPrompt, keyword));
            const score = matchedKeywords.reduce((total, keyword) => total + (String(keyword).includes(" ") ? 2 : 1), 0);
            return {
                packId,
                pack,
                matchedKeywords,
                score
            };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(0, maxPacks));

    const tags = [...new Set(scored.flatMap((entry) => entry.pack.tags || []))];

    return {
        packIds: scored.map((entry) => entry.packId),
        packs: scored.map((entry) => entry.pack),
        tags,
        matchedKeywords: [...new Set(scored.flatMap((entry) => entry.matchedKeywords))]
    };
}

function getStylePack(name) {
    if (!name) {
        return { name: "none", tags: [] };
    }

    return styleConfig.packs[name] || { name: "none", tags: [] };
}

module.exports = {
    getStylePack,
    inferStylePacks
};
