
const { normalizePromptLanguage, containsAnimeKeywords } = require("../core/promptNormalizer");

// List of illegal/explicit prompt patterns (expand as needed)
const ILLEGAL_PATTERNS = [
	/child sexual abuse/i,
	/underage\s*(teen|child|minor)/i,
	/non-consensual/i,
	/rape|assault|molest/i
];

const EXPLICIT_PATTERNS = [
	/erotic|nude|sex|sexual|porn|explicit|nsfw/i
];

function isIllegalPrompt(prompt) {
	return ILLEGAL_PATTERNS.some((re) => re.test(prompt));
}

function isExplicitPrompt(prompt) {
	return EXPLICIT_PATTERNS.some((re) => re.test(prompt));
}

/**
 * Evaluates a prompt for content policy compliance.
 * @param {string} prompt - The user prompt to check.
 * @param {object} options - { userAge: number }
 * @returns {{ allowed: boolean, reason: string }}
 */
function evaluateContentPolicy(prompt, options = {}) {
	const userAge = Number(options.userAge) || 0;
	const norm = normalizePromptLanguage(prompt);
	const cleaned = norm.cleanedPrompt || "";

	// 1. Block illegal content
	if (isIllegalPrompt(cleaned)) {
		return { allowed: false, reason: "illegal-content" };
	}

	// 2. Block explicit content for minors
	if (userAge < 18 && isExplicitPrompt(cleaned)) {
		return { allowed: false, reason: "minor-adult-content" };
	}

	// 3. Contextual moderation for anime (example: always allow safe anime prompts)
	if (containsAnimeKeywords(cleaned)) {
		return { allowed: true, reason: "contextual-anime-safe" };
	}

	// 4. Allow all other prompts by default
	return { allowed: true, reason: "allowed" };
}

module.exports = {
	evaluateContentPolicy
};
