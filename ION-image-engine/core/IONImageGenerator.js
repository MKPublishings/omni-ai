const promptOrchestrator = require("./promptOrchestrator");
const multiPassRefiner = require("./multiPassRefiner");
const modelRouter = require("./modelRouter");
const fileExporter = require("../io/fileExporter");
const logger = require("../utils/logger");

const STILL_MODE_NEGATIVE_TERMS = [
    "motion",
    "animation",
    "frames",
    "sequence",
    "moving camera",
    "camera pan",
    "camera movement",
    "frame interpolation"
];

function normalizeGenerationMode(options = {}) {
    return "image";
}

async function generate(userPrompt, options = {}) {
    const generationMode = normalizeGenerationMode(options);
    const orchestrated = promptOrchestrator(userPrompt, {
        ...options,
        generation_mode: generationMode
    });
    const { data, finalOptions } = multiPassRefiner(orchestrated, options);

    data.negativeTags = [...new Set([...(data.negativeTags || []), ...STILL_MODE_NEGATIVE_TERMS])];

    // Default to the live image-gen worker route and keep provider fallbacks behind the router.
    const generationOptions = {
        ...finalOptions,
        ratio: options.ratio || finalOptions.ratio || "9:16",
        resolution: options.resolution || finalOptions.resolution || "4k",
        width: Number(options.width) || Number(finalOptions.width) || 2160,
        height: Number(options.height) || Number(finalOptions.height) || 3840,
        strictDimensions: options.strictDimensions !== false,
        generation_mode: generationMode,
        disableTemporal: generationMode === "image",
        negativePrompt: Array.isArray(data.negativeTags) ? data.negativeTags.join(", ") : ""
    };

    const imageBuffer = await modelRouter.generateImage(data.finalPrompt, generationOptions);

    // Export to disk with ION_image_(date&time).ext
    const filePath = await fileExporter.exportImageWithMeta(imageBuffer, generationOptions);

    return {
        userPrompt,
        generationMode,
        orchestrated,
        refined: data,
        options: finalOptions,
        filePath
    };
}

module.exports = {
    generate
};
