const extractEnvironment = require("../utils/extractEnvironment");
const logger = require("../utils/logger");

module.exports = function sceneEnforcer(promptData) {
    const envKeywords = extractEnvironment(promptData.userPrompt);
    const normalizedKeywords = Array.isArray(envKeywords) ? envKeywords : [];

    if (!normalizedKeywords.length) {
        logger.info("No explicit environment found; allowing model freedom.");
        return promptData;
    }

    const envString = `environment: ${normalizedKeywords.join(", ")}`;
    promptData.semanticExpansion = [
        promptData.semanticExpansion,
        envString
    ].filter(Boolean).join(", ");

    logger.info("Scene enforced with environment:", normalizedKeywords);
    return promptData;
};
