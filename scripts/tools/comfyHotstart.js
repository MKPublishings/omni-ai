#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const DEFAULT_HOST = String(process.env.COMFYUI_HOST || "http://127.0.0.1:8188").replace(/\/+$/, "");
const DEFAULT_START_BAT = process.env.COMFYUI_START_BAT || "C:/ComfyUI/ComfyUI/start-ion.bat";
const READY_TIMEOUT_MS = Number(process.env.ION_COMFY_READY_TIMEOUT_MS || 180_000);
const READY_POLL_MS = Number(process.env.ION_COMFY_READY_POLL_MS || 2_000);
const OPEN_UI = !["0", "false", "off", "no"].includes(String(process.env.ION_COMFY_OPEN_UI || "1").toLowerCase());
const WARMUP_ENABLED = !["0", "false", "off", "no"].includes(String(process.env.ION_COMFY_WARMUP_ENABLED || "1").toLowerCase());
const WARMUP_TEXT = String(process.env.ION_COMFY_WARMUP_TEXT || "warmup");
const WARMUP_NEGATIVE = String(process.env.ION_COMFY_WARMUP_NEGATIVE || "blurry, lowres, noisy, artifacts");
const WARMUP_WIDTH = Number(process.env.ION_COMFY_WARMUP_WIDTH || 768);
const WARMUP_HEIGHT = Number(process.env.ION_COMFY_WARMUP_HEIGHT || 768);
const WARMUP_WORKFLOW_PATH = process.env.ION_COMFY_WARMUP_WORKFLOW || "";

const DEFAULT_CKPT_CANDIDATES = [
  String(process.env.ION_COMFY_WARMUP_CKPT || "omnigen2_t2i.safetensors"),
  "flux2-klein-4b-fp8.safetensors",
  "v1-5-pruned-emaonly-fp16.safetensors",
];

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

function startComfyGpu() {
  if (!fs.existsSync(DEFAULT_START_BAT)) {
    throw new Error(`ComfyUI launcher was not found at: ${DEFAULT_START_BAT}`);
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
  throw new Error(`Timed out waiting for ComfyUI at ${host} after ${READY_TIMEOUT_MS}ms`);
}

function buildMinimalWarmupPayload() {
  const ckptName = String(process.env.ION_COMFY_WARMUP_CKPT_SELECTED || DEFAULT_CKPT_CANDIDATES[0]);
  return {
    prompt: {
      "1": {
        class_type: "CheckpointLoaderSimple",
        inputs: {
          ckpt_name: ckptName,
        },
      },
      "2": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: WARMUP_TEXT,
          clip: ["1", 1],
        },
      },
      "3": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: WARMUP_NEGATIVE,
          clip: ["1", 1],
        },
      },
      "4": {
        class_type: "EmptyLatentImage",
        inputs: {
          width: WARMUP_WIDTH,
          height: WARMUP_HEIGHT,
          batch_size: 1,
        },
      },
      "5": {
        class_type: "KSampler",
        inputs: {
          seed: Math.floor(Date.now() % 2_147_483_647),
          steps: Number(process.env.ION_COMFY_WARMUP_STEPS || 6),
          cfg: Number(process.env.ION_COMFY_WARMUP_CFG || 1.0),
          sampler_name: String(process.env.ION_COMFY_WARMUP_SAMPLER || "euler"),
          scheduler: String(process.env.ION_COMFY_WARMUP_SCHEDULER || "simple"),
          denoise: Number(process.env.ION_COMFY_WARMUP_DENOISE || 0.9),
          model: ["1", 0],
          positive: ["2", 0],
          negative: ["3", 0],
          latent_image: ["4", 0],
        },
      },
      "6": {
        class_type: "VAEDecode",
        inputs: {
          samples: ["5", 0],
          vae: ["1", 2],
        },
      },
      "7": {
        class_type: "SaveImage",
        inputs: {
          filename_prefix: String(process.env.ION_COMFY_WARMUP_PREFIX || "ion-warmup"),
          images: ["6", 0],
        },
      },
    },
  };
}

function extractCheckpointList(objectInfoData) {
  const required = objectInfoData?.CheckpointLoaderSimple?.input?.required;
  const ckptInput = required?.ckpt_name;
  const maybeList = Array.isArray(ckptInput) ? ckptInput[0] : null;
  if (!Array.isArray(maybeList)) {
    return [];
  }
  return maybeList.map((name) => String(name));
}

async function chooseCheckpoint(host) {
  try {
    const objectInfo = await requestJson(`${host}/object_info/CheckpointLoaderSimple`, { method: "GET" });
    if (objectInfo.status !== 200 || !objectInfo.data) {
      return DEFAULT_CKPT_CANDIDATES[0];
    }

    const available = extractCheckpointList(objectInfo.data);
    if (!available.length) {
      return DEFAULT_CKPT_CANDIDATES[0];
    }

    const selected = DEFAULT_CKPT_CANDIDATES.find((name) => available.includes(name)) || available[0];
    log(`• warmup checkpoint: ${selected}`);
    return selected;
  } catch {
    return DEFAULT_CKPT_CANDIDATES[0];
  }
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
  const selectedCkpt = await chooseCheckpoint(host);
  process.env.ION_COMFY_WARMUP_CKPT_SELECTED = selectedCkpt;
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
    log(`• starting ComfyUI GPU: ${DEFAULT_START_BAT}`);
    startComfyGpu();
  } else {
    log("• ComfyUI is already running");
  }

  log("• waiting for ComfyUI readiness...");
  await waitForServer(DEFAULT_HOST);
  log("✓ ComfyUI is ready");

  if (WARMUP_ENABLED) {
    log("• sending warmup prompt...");
    await enqueueWarmup(DEFAULT_HOST);
  } else {
    log("• warmup skipped (ION_COMFY_WARMUP_ENABLED=0)");
  }

  openUi(DEFAULT_HOST);
  log("✓ hotstart complete");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`✖ comfy hotstart failed: ${message}`);
  process.exitCode = 1;
});
