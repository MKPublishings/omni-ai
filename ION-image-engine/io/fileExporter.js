const fs = require("fs");
const path = require("path");
const { formatDateTimeForFilename } = require("../utils/datetime");
const logger = require("../utils/logger");

const OUTPUT_DIR = path.join(process.cwd(), "ION_image_exports");

function ensureOutputDir() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
}

function toExportBuffer(value) {
    if (Buffer.isBuffer(value)) {
        return value;
    }

    if (value instanceof ArrayBuffer) {
        return Buffer.from(value);
    }

    if (ArrayBuffer.isView(value)) {
        return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    }

    throw new Error("Image exporter received unsupported payload type");
}

function detectImageFormat(buffer) {
    if (!buffer || buffer.length < 12) return "";
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "png";
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
    if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) return "webp";
    return "";
}

function normalizeFormatLabel(format) {
    const normalized = String(format || "png").toLowerCase();
    if (normalized === "jpeg") return "jpg";
    return normalized;
}

function prepareExportPayload(value, requestedFormat) {
    const buffer = toExportBuffer(value);
    if (buffer.length === 0) {
        throw new Error("Image exporter received empty payload");
    }

    const requested = normalizeFormatLabel(requestedFormat);
    const detected = detectImageFormat(buffer);
    const format = detected || requested || "png";

    if (detected && requested && detected !== requested) {
        logger.info(`Export format adjusted from '${requested}' to detected '${detected}'`);
    }

    return { buffer, format };
}

async function exportImage(buffer, format = "png") {
    ensureOutputDir();

    const prepared = prepareExportPayload(buffer, format);

    const timestamp = formatDateTimeForFilename(new Date());
    const filename = `ION_image_${timestamp}.${prepared.format}`;
    const filePath = path.join(OUTPUT_DIR, filename);

    await fs.promises.writeFile(filePath, prepared.buffer);

    logger.info("Image exported:", filePath);
    return filePath;
}

function sanitizeRatioLabel(ratio) {
    const raw = String(ratio || "").trim();
    if (!raw) return "";
    return raw.replace(/\s+/g, "").replace(/:/g, "x").replace(/[^a-zA-Z0-9x_-]/g, "");
}

async function exportImageWithMeta(buffer, options = {}) {
    ensureOutputDir();

    const prepared = prepareExportPayload(buffer, options.format || "png");
    const timestamp = formatDateTimeForFilename(new Date());
    const width = Number(options.width) || 0;
    const height = Number(options.height) || 0;
    const ratioLabel = sanitizeRatioLabel(options.ratio || options.aspectRatio || (width > 0 && height > 0 ? `${width}:${height}` : ""));
    const resolutionLabel = width > 0 && height > 0 ? `${width}x${height}` : "";

    const parts = ["ION_image", timestamp];
    if (ratioLabel) parts.push(ratioLabel);
    if (resolutionLabel) parts.push(resolutionLabel);

    const filename = `${parts.join("_")}.${prepared.format}`;
    const filePath = path.join(OUTPUT_DIR, filename);

    await fs.promises.writeFile(filePath, prepared.buffer);
    logger.info("Image exported:", filePath);
    return filePath;
}

module.exports = {
    exportImage,
    exportImageWithMeta
};
