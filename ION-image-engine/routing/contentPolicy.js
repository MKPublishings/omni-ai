const ILLEGAL_TERMS = [
    "child sexual abuse",
    "csam",
    "sexual content with minor",
    "fake passport",
    "counterfeit id",
    "credit card fraud",
    "bank fraud",
    "wire fraud",
    "drug trafficking",
    "build a bomb",
    "explosive recipe",
    "terror attack",
    "ransomware",
    "steal password",
    "bypass police"
];

const ADULT_TERMS = [
    "nude",
    "nudity",
    "explicit nudity",
    "erotic",
    "porn",
    "sexual content",
    "sex scene",
    "adult content",
    "fetish"
];

function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
}

function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTermPattern(term) {
    const tokens = String(term || "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => escapeRegExp(token));
    if (!tokens.length) {
        return /$^/;
    }
    return new RegExp(`\\b${tokens.join("\\s+")}\\b`, "i");
}

function detectMatches(text, terms) {
    return terms.filter((term) => buildTermPattern(term).test(text));
}

function isMinor(options = {}) {
    if (options.isMinor === true) return true;
    const age = Number(options.userAge);
    if (Number.isFinite(age)) {
        return age < 18;
    }
    return false;
}

function evaluateContentPolicy(prompt, options = {}) {
    const text = normalizeText(prompt);
    const illegalMatches = detectMatches(text, ILLEGAL_TERMS);
    const adultMatches = detectMatches(text, ADULT_TERMS);
    const minor = isMinor(options);

    if (illegalMatches.length > 0) {
        return {
            allowed: false,
            reason: "illegal-content",
            advice: "I can’t help generate illegal content. Please choose a legal and safe request.",
            matchedTerms: illegalMatches,
            flags: {
                illegal: true,
                adult: adultMatches.length > 0,
                minor
            }
        };
    }

    if (adultMatches.length > 0 && minor) {
        return {
            allowed: false,
            reason: "minor-adult-content",
            advice: "I can’t help create adult content for users under 18. Please choose a non-adult prompt.",
            matchedTerms: adultMatches,
            flags: {
                illegal: false,
                adult: true,
                minor: true
            }
        };
    }

    return {
        allowed: true,
        reason: "allowed",
        advice: adultMatches.length > 0 && !minor
            ? "Adult request detected and allowed for an adult user."
            : "",
        matchedTerms: adultMatches,
        flags: {
            illegal: false,
            adult: adultMatches.length > 0,
            minor
        }
    };
}

module.exports = {
    evaluateContentPolicy
};
