const modelConfig = require("../config/modelConfig.json");
const logger = require("../utils/logger");

const RATIO_PRESETS = {
    "1:1": [1, 1],
    "4:3": [4, 3],
    "3:4": [3, 4],
    "3:2": [3, 2],
    "2:3": [2, 3],
    "16:9": [16, 9],
    "9:16": [9, 16],
    "21:9": [21, 9],
    "9:21": [9, 21],
    "5:4": [5, 4],
    "4:5": [4, 5],
    "18:9": [18, 9],
    "9:18": [9, 18],
    "2:1": [2, 1],
    "1:2": [1, 2]
};

const RESOLUTION_PRESETS = {
    "512": 512,
    "720p": 1280,
    "1080p": 1920,
    "1440p": 2560,
    "4k": 3840,
    "5k": 5120,
    "6k": 6144,
    "8k": 7680
};

const ACTIVE_PROVIDER = "ion-worker";
const RETIRED_MODELS = new Set(["ION_openai", "ION_stability"]);
const RETIRED_PROVIDERS = new Set(["openai", "stability"]);

function toPositiveInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.floor(n);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x || 1;
}

function toAspectRatio(width, height) {
    const w = Math.max(1, Math.floor(Number(width) || 1024));
    const h = Math.max(1, Math.floor(Number(height) || 1024));
    const divisor = gcd(w, h);
    return `${Math.floor(w / divisor)}:${Math.floor(h / divisor)}`;
}

function parseRatio(ratioInput) {
    const raw = String(ratioInput || "").trim();
    if (!raw) return null;

    if (RATIO_PRESETS[raw]) {
        return RATIO_PRESETS[raw];
    }

    const match = raw.match(/^(\d+)\s*:\s*(\d+)$/);
    if (!match) return null;

    const rw = Number(match[1]);
    const rh = Number(match[2]);
    if (!Number.isFinite(rw) || !Number.isFinite(rh) || rw <= 0 || rh <= 0) {
        return null;
    }
    return [rw, rh];
}

function deriveDimensions(options = {}) {
    const maxSide = toPositiveInt(options.maxSide || modelConfig.maxOutputSide || 8192, 8192);
    const minSide = toPositiveInt(options.minSide || modelConfig.minOutputSide || 256, 256);

    let width = toPositiveInt(options.width, 0);
    let height = toPositiveInt(options.height, 0);

    const ratioPair = parseRatio(options.ratio || options.aspectRatio || "");
    const presetSide = RESOLUTION_PRESETS[String(options.resolution || "").toLowerCase()];

    if (width > 0 && height > 0) {
        return {
            width: clamp(width, minSide, maxSide),
            height: clamp(height, minSide, maxSide)
        };
    }

    if (ratioPair && presetSide) {
        const [rw, rh] = ratioPair;
        if (rw >= rh) {
            width = presetSide;
            height = Math.max(minSide, Math.floor((presetSide * rh) / rw));
        } else {
            height = presetSide;
            width = Math.max(minSide, Math.floor((presetSide * rw) / rh));
        }

        return {
            width: clamp(width, minSide, maxSide),
            height: clamp(height, minSide, maxSide)
        };
    }

    if (ratioPair) {
        const [rw, rh] = ratioPair;
        const base = toPositiveInt(options.longEdge || options.shortEdge || 2048, 2048);
        if (rw >= rh) {
            width = base;
            height = Math.max(minSide, Math.floor((base * rh) / rw));
        } else {
            height = base;
            width = Math.max(minSide, Math.floor((base * rw) / rh));
        }

        return {
            width: clamp(width, minSide, maxSide),
            height: clamp(height, minSide, maxSide)
        };
    }

    if (presetSide) {
        return {
            width: clamp(presetSide, minSide, maxSide),
            height: clamp(presetSide, minSide, maxSide)
        };
    }

    return {
        width: clamp(toPositiveInt(options.defaultWidth, 1024), minSide, maxSide),
        height: clamp(toPositiveInt(options.defaultHeight, 1024), minSide, maxSide)
    };
}

function toNonEmptyBuffer(value, sourceLabel) {
    if (Buffer.isBuffer(value)) {
        if (value.length === 0) {
            throw new Error(`${sourceLabel} returned an empty image payload`);
        }
        return value;
    }

    if (value instanceof ArrayBuffer) {
        const normalized = Buffer.from(value);
        if (normalized.length === 0) {
            throw new Error(`${sourceLabel} returned an empty image payload`);
        }
        return normalized;
    }

    if (ArrayBuffer.isView(value)) {
        const view = value;
        const normalized = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
        if (normalized.length === 0) {
            throw new Error(`${sourceLabel} returned an empty image payload`);
        }
        return normalized;
    }

    throw new Error(`${sourceLabel} returned an unsupported image payload type`);
}

async function callIonWorkerImages(prompt, options) {
    const endpoint =
        options.endpoint ||
        process.env.ION_IMAGE_WORKER_URL ||
        process.env.ION_ORCHESTRATOR_URL ||
        "https://ionirix.com/api/image";

    const width = toPositiveInt(options.width, 2160);
    const height = toPositiveInt(options.height, 3840);
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userId: String(options.userId || "ion-image-engine"),
            prompt: String(prompt || ""),
            stylePack: String(options.stylePack || options.style || ""),
            quality: String(options.quality || "ultra"),
            mode: String(options.mode || "simple"),
            ratio: String(options.ratio || toAspectRatio(width, height)),
            resolution: String(options.resolution || `${width}x${height}`),
            width,
            height,
            seed: Number.isFinite(Number(options.seed)) ? Number(options.seed) : undefined,
            feedback: String(options.feedback || ""),
            camera: String(options.camera || ""),
            lighting: String(options.lighting || ""),
            materials: Array.isArray(options.materials) ? options.materials : [],
            safetyProfile: options.safetyProfile
        })
    });

    if (!response.ok) {
        const reason = await response.text();
        throw new Error(`ION worker image generation failed (${response.status}): ${reason}`);
    }

    const json = await response.json();
    const imageDataUrl = String(json?.imageDataUrl || "");
    if (!imageDataUrl.startsWith("data:image/")) {
        throw new Error("ION worker response did not include imageDataUrl");
    }

    const commaIndex = imageDataUrl.indexOf(",");
    if (commaIndex <= 0) {
        throw new Error("ION worker response included malformed imageDataUrl");
    }

    const buffer = Buffer.from(imageDataUrl.slice(commaIndex + 1), "base64");
    return toNonEmptyBuffer(buffer, "ION worker");
}

async function callUnderlyingModel(prompt, options) {
    const provider = String(options.provider || ACTIVE_PROVIDER).toLowerCase();
    logger.info(`Calling provider: ${provider}`);

    if (provider === "ion-worker") {
        return callIonWorkerImages(prompt, options);
    }

    if (RETIRED_PROVIDERS.has(provider)) {
        throw new Error(`Legacy image provider '${provider}' has been retired. Use the worker-backed ION image route instead.`);
    }

    throw new Error(`Unsupported image provider: ${provider}`);
}

function resolveActiveModelName(requestedModelName) {
    const modelName = String(requestedModelName || modelConfig.defaultModel || "").trim() || modelConfig.defaultModel;

    if (RETIRED_MODELS.has(modelName)) {
        throw new Error(`Legacy image model '${modelName}' has been retired. Use 'ION_worker' instead.`);
    }

    if (!modelConfig.models?.[modelName]) {
        throw new Error(`Unknown model '${modelName}' in modelConfig.json`);
    }

    if (modelName !== modelConfig.defaultModel) {
        throw new Error(`Legacy model override '${modelName}' is no longer supported. Use '${modelConfig.defaultModel}' instead.`);
    }

    return modelName;
}

function buildMergedOptions(modelSettings, options) {
    const resolved = deriveDimensions({
        ...options,
        defaultWidth: options.width || modelSettings.defaultWidth,
        defaultHeight: options.height || modelSettings.defaultHeight
    });

    return {
        provider: ACTIVE_PROVIDER,
        providerModel: modelSettings.providerModel,
        endpoint: modelSettings.endpoint,
        apiKeyEnv: modelSettings.apiKeyEnv,
        apiKey: modelSettings.apiKeyEnv ? process.env[modelSettings.apiKeyEnv] : undefined,
        ratio: options.ratio || options.aspectRatio || "",
        resolution: options.resolution || "",
        width: resolved.width,
        height: resolved.height,
        steps: options.steps || modelSettings.defaultSteps,
        cfgScale: options.cfgScale || modelSettings.defaultCfgScale,
        ...options,
        provider: ACTIVE_PROVIDER,
    };
}

async function generateImage(finalPrompt, options = {}) {
    const modelName = resolveActiveModelName(options.model);
    const modelSettings = modelConfig.models[modelName];
    const mergedOptions = buildMergedOptions(modelSettings, options);

    try {
        return await callUnderlyingModel(finalPrompt, mergedOptions);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Provider attempt failed for '${modelName}':`, message);
        throw new Error(`Image generation failed via '${modelName}': ${message}`);
    }
}

module.exports = {
    generateImage
};
