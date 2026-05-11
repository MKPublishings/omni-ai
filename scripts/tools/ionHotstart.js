#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const DEFAULT_HOST = String(process.env.ion_HOST || "http://127.0.0.1:8188").replace(/\/+$/, "");
const DEFAULT_START_BAT = process.env.ion_START_BAT || "C:/ion/ion/start-ion.bat";
const READY_TIMEOUT_MS = Number(process.env.ION_Ion_READY_TIMEOUT_MS || 180_000);
const READY_POLL_MS = Number(process.env.ION_Ion_READY_POLL_MS || 2_000);
const OPEN_UI = !["0", "false", "off", "no"].includes(String(process.env.ION_Ion_OPEN_UI || "1").toLowerCase());
const WARMUP_ENABLED = !["0", "false", "off", "no"].includes(String(process.env.ION_Ion_WARMUP_ENABLED || "1").toLowerCase());
const WARMUP_TEXT = String(process.env.ION_Ion_WARMUP_TEXT || "warmup");
const WARMUP_NEGATIVE = String(process.env.ION_Ion_WARMUP_NEGATIVE || "blurry, lowres, noisy, artifacts");
const WARMUP_WIDTH = Number(process.env.ION_Ion_WARMUP_WIDTH || 768);
const WARMUP_HEIGHT = Number(process.env.ION_Ion_WARMUP_HEIGHT || 768);
const WARMUP_WORKFLOW_PATH = process.env.ION_Ion_WARMUP_WORKFLOW || "";
const WARMUP_GROK_MODEL = String(process.env.ION_Ion_WARMUP_MODEL || "grok-imagine-image-beta");
const WARMUP_GROK_RESOLUTION = String(process.env.ION_Ion_WARMUP_RESOLUTION || "1K").toUpperCase() === "2K" ? "2K" : "1K";

function resolveWarmupAspectRatio(width, height) {
  if (!(Number.isFinite(width) && Number.isFinite(height)) || width <= 0 || height <= 0) {
    return "1:1";
  }

  const ratio = width / height;
  if (ratio >= 1.7) return "16:9";
  if (ratio >= 1.25) return "4:3";
  if (ratio <= 0.56) return "9:16";
  if (ratio <= 0.75) return "3:4";
  return "1:1";
}

function log(line) {
  process.stdout.write(`${line}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json,text/plain,*/*",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    text,
    data,
  };
}

async function isServerReady(host) {
  try {
    const result = await requestJson(`${host}/queue`, { method: "GET" });
    return result.status === 200;
  } catch {
    return false;
  }
}

function startIonGpu() {
  if (!fs.existsSync(DEFAULT_START_BAT)) {
    throw new Error(`ion launcher was not found at: ${DEFAULT_START_BAT}`);
  }

  const child = spawn("cmd.exe", ["/c", "start", "", DEFAULT_START_BAT], {
    windowsHide: false,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function waitForServer(host) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= READY_TIMEOUT_MS) {
    // eslint-disable-next-line no-await-in-loop
    const ready = await isServerReady(host);
    if (ready) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(READY_POLL_MS);
  }
  throw new Error(`Timed out waiting for ion at ${host} after ${READY_TIMEOUT_MS}ms`);
}

function buildMinimalWarmupPayload() {
  const aspectRatio = resolveWarmupAspectRatio(WARMUP_WIDTH, WARMUP_HEIGHT);
  const warmupPrompt = `${WARMUP_TEXT}, ${WARMUP_NEGATIVE}`;

  return {
    prompt: {
      "1": {
        class_type: "GrokImageNode",
        inputs: {
          model: WARMUP_GROK_MODEL,
          prompt: warmupPrompt,
          aspect_ratio: aspectRatio,
          number_of_images: 1,
          seed: Math.floor(Date.now() % 2_147_483_647),
          resolution: WARMUP_GROK_RESOLUTION,
        },
      },
      "2": {
        class_type: "SaveImage",
        inputs: {
          filename_prefix: String(process.env.ION_Ion_WARMUP_PREFIX || "ion-warmup"),
          images: ["1", 0],
        },
      },
    },
  };
}

function loadWarmupPayload() {
  if (!WARMUP_WORKFLOW_PATH) {
    return buildMinimalWarmupPayload();
  }

  const workflowPath = path.resolve(process.cwd(), WARMUP_WORKFLOW_PATH);
  if (!fs.existsSync(workflowPath)) {
    throw new Error(`Warmup workflow file not found: ${workflowPath}`);
  }

  const raw = fs.readFileSync(workflowPath, "utf8");
  const parsed = JSON.parse(raw);

  // Accept either prompt payload or full API wrapper.
  if (parsed && parsed.prompt && typeof parsed.prompt === "object") {
    return parsed;
  }
  if (parsed && typeof parsed === "object") {
    return { prompt: parsed };
  }

  throw new Error("Warmup workflow JSON is invalid. Expected an object or { prompt: ... } payload.");
}

async function enqueueWarmup(host) {
  const payload = loadWarmupPayload();
  const result = await requestJson(`${host}/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (![200, 201].includes(result.status)) {
    throw new Error(`Warmup enqueue failed: status=${result.status} body=${result.text}`);
  }

  const promptId = result.data?.prompt_id || "(unknown)";
  log(`• warmup submitted (prompt_id=${promptId})`);
}

function openUi(host) {
  if (!OPEN_UI) {
    return;
  }

  spawn("cmd.exe", ["/c", "start", "", `${host}/`], {
    windowsHide: false,
    detached: true,
    stdio: "ignore",
  }).unref();
}

async function main() {
  log(`• host: ${DEFAULT_HOST}`);

  const alreadyReady = await isServerReady(DEFAULT_HOST);
  if (!alreadyReady) {
    log(`• starting ion GPU: ${DEFAULT_START_BAT}`);
    startIonGpu();
  } else {
    log("• ion is already running");
  }

  log("• waiting for ion readiness...");
  await waitForServer(DEFAULT_HOST);
  log("✓ ion is ready");

  if (WARMUP_ENABLED) {
    log("• sending warmup prompt...");
    await enqueueWarmup(DEFAULT_HOST);
  } else {
    log("• warmup skipped (ION_Ion_WARMUP_ENABLED=0)");
  }

  openUi(DEFAULT_HOST);
  log("✓ hotstart complete");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`✖ ion hotstart failed: ${message}`);
  process.exitCode = 1;
});
