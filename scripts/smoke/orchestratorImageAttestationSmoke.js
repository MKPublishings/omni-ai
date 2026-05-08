const DEFAULT_ORCHESTRATOR_URL = "https://ionirix.com";
const ORCHESTRATOR_URL = String(process.env.ION_ORCHESTRATOR_URL || DEFAULT_ORCHESTRATOR_URL).replace(/\/+$/, "");
const ORCHESTRATOR_FALLBACK_URLS = String(process.env.ION_ORCHESTRATOR_FALLBACK_URLS || "")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const REQUEST_TIMEOUT_MS = Number(process.env.ION_SMOKE_TIMEOUT_MS || 90_000);
const FETCH_RETRIES = Math.max(1, Number(process.env.ION_SMOKE_FETCH_RETRIES || 3));
const FETCH_RETRY_DELAY_MS = Math.max(100, Number(process.env.ION_SMOKE_FETCH_RETRY_DELAY_MS || 1_250));
const REQUIRE_ORCHESTRATOR = process.env.ION_SMOKE_REQUIRE_ORCHESTRATOR
  ? ["1", "true", "yes"].includes(String(process.env.ION_SMOKE_REQUIRE_ORCHESTRATOR).trim().toLowerCase())
  : ["1", "true"].includes(String(process.env.CI || "").trim().toLowerCase());
const RUN_LONG_PROMPT_CLAMP_CHECK = ["1", "true", "yes"].includes(
  String(process.env.ION_SMOKE_LONG_PROMPT || "").trim().toLowerCase()
);
const REQUIRE_IMAGE_GEN_V2 = ["1", "true", "yes"].includes(
  String(process.env.ION_SMOKE_REQUIRE_IMAGE_GEN_V2 || "").trim().toLowerCase()
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildCandidateUrls() {
  const candidates = [ORCHESTRATOR_URL, ...ORCHESTRATOR_FALLBACK_URLS];
  if (!process.env.ION_ORCHESTRATOR_URL) {
    candidates.push("http://127.0.0.1:8787", "http://localhost:8787");
  }
  return Array.from(new Set(candidates.map((value) => value.replace(/\/+$/, "")).filter(Boolean)));
}

async function resolveReachableOrchestratorUrl() {
  const errors = [];
  for (const candidate of buildCandidateUrls()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, 8_000));
    try {
      // Reachability probe: any HTTP response indicates the endpoint is reachable.
      await fetch(`${candidate}/`, {
        method: "GET",
        headers: { Accept: "application/json,text/plain,*/*" },
        signal: controller.signal
      });
      return candidate;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${candidate} -> ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`No reachable orchestrator endpoint. Attempts: ${errors.join(" | ")}`);
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function postJson(baseUrl, path, payload) {
  let lastError = null;

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      const result = {
        status: response.status,
        headers: response.headers,
        data,
        rawText: text
      };

      if (response.status >= 500 && attempt < FETCH_RETRIES) {
        await sleep(FETCH_RETRY_DELAY_MS * attempt);
        continue;
      }

      return result;
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRIES) {
        await sleep(FETCH_RETRY_DELAY_MS * attempt);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError || "fetch failed"));
}

function buildAttestedSafetyProfile() {
  return {
    ageTier: "adult",
    humanVerified: true,
    adultAccess: true,
    explicitAllowed: false,
    illegalBlocked: true,
    legalAttestation: {
      accepted: true,
      jurisdiction: "US",
      truthfulIdentity: true,
      lawfulUse: true,
      userDirected: true,
      acceptedAt: Date.now()
    }
  };
}

function expectAttestedImageSuccess(result, label) {
  expect(result.status === 200, `${label}: expected status 200, got ${result.status}`);
  expect(result.data && typeof result.data === "object", `${label}: expected JSON response object`);
  expect(
    typeof result.data.imageDataUrl === "string" && result.data.imageDataUrl.startsWith("data:image/"),
    `${label}: expected imageDataUrl data URI`
  );
  expect(typeof result.data.filename === "string" && result.data.filename.length > 0, `${label}: expected filename`);
  expect(result.data.metadata && typeof result.data.metadata === "object", `${label}: expected metadata object`);

  const modelHeader = String(result.headers.get("X-ION-Image-Model") || "").trim();
  expect(modelHeader.length > 0, `${label}: expected X-ION-Image-Model header`);

  const routeHeader = String(result.headers.get("X-ION-Image-Route") || "").trim();
  expect(routeHeader.length > 0, `${label}: expected X-ION-Image-Route header`);
}

function expectUnattestedImageBehavior(result, label) {
  if (result.status === 403) {
    expect(
      String(result.data?.code || "") === "legal-attestation-required",
      `${label}: expected unattested code legal-attestation-required, got ${String(result.data?.code || "(missing)")}`
    );
    return "blocked";
  }

  expectAttestedImageSuccess(result, label);
  expectPromptDoesNotUseNegativeLabel(result, label);
  expectImageRouteObservability(result, label);
  return "allowed";
}

function expectImageRouteObservability(result, label) {
  const routeHeader = String(result.headers.get("X-ION-Image-Route") || "").trim();
  const fallbackHeader = String(result.headers.get("X-ION-Image-Fallback") || "").trim();
  const fallbackReasonHeader = String(result.headers.get("X-ION-Image-Fallback-Reason") || "").trim();

  expect(routeHeader === "image-gen-v2", `${label}: expected X-ION-Image-Route=image-gen-v2, got '${routeHeader || "(missing)"}'`);
  expect(!fallbackHeader, `${label}: image-gen-v2 success should not expose X-ION-Image-Fallback`);
  expect(!fallbackReasonHeader, `${label}: image-gen-v2 success should not expose X-ION-Image-Fallback-Reason`);
}

function expectPromptDoesNotUseNegativeLabel(result, label) {
  const assembledPrompt = String(
    result?.data?.metadata?.prompt?.finalPrompt ||
      result?.data?.metadata?.prompt?.positive ||
      ""
  );
  expect(assembledPrompt.length > 0, `${label}: expected assembled prompt metadata`);
  expect(!/\bnegative\s*:/i.test(assembledPrompt), `${label}: assembled prompt must not include 'negative:' label`);
}

async function run() {
  let orchestratorUrl = "";
  try {
    orchestratorUrl = await resolveReachableOrchestratorUrl();
  } catch (error) {
    if (REQUIRE_ORCHESTRATOR) {
      throw error;
    }

    console.log("• orchestrator endpoint unreachable; skipping attestation smoke test in non-strict mode");
    console.log(
      `• set ION_SMOKE_REQUIRE_ORCHESTRATOR=1 to enforce this check locally (reason: ${
        error instanceof Error ? error.message : String(error)
      })`
    );
    return;
  }

  console.log(`• using orchestrator endpoint: ${orchestratorUrl}`);

  const commonPayload = {
    userId: "smoke-orchestrator-attestation",
    feedback: "",
    stylePack: "",
    quality: "ultra",
    ratio: "9:16",
    resolution: "4k",
    width: 2160,
    height: 3840
  };

  const unattested = await postJson(orchestratorUrl, "/api/image", {
    ...commonPayload,
    prompt: "Photorealistic portrait of an astronaut in a greenhouse, vertical 9:16, high detail"
  });

  const unattestedBehavior = expectUnattestedImageBehavior(unattested, "unattested baseline prompt");
  if (unattestedBehavior === "blocked") {
    console.log("✓ orchestrator legal gate blocks unattested /api/image requests");
  } else {
    console.log("✓ orchestrator /api/image accepts unattested baseline requests under current live policy");
    console.log(`• unattested baseline route: ${String(unattested.headers.get("X-ION-Image-Route") || "(missing)")}`);
  }

  const attested = await postJson(orchestratorUrl, "/api/image", {
    ...commonPayload,
    prompt: "Photorealistic portrait of a smiling astronaut in a white suit standing in a bright botanical greenhouse, vertical 9:16, 4k, high detail",
    safetyProfile: buildAttestedSafetyProfile()
  });

  expectAttestedImageSuccess(attested, "attested baseline prompt");
  expectPromptDoesNotUseNegativeLabel(attested, "attested baseline prompt");
  expectImageRouteObservability(attested, "attested baseline prompt");
  console.log("✓ orchestrator /api/image returns attested image payload with metadata");
  console.log(`• attested baseline route: ${String(attested.headers.get("X-ION-Image-Route") || "(missing)")}`);

  if (RUN_LONG_PROMPT_CLAMP_CHECK) {
    const longPrompt = `Photorealistic portrait of a smiling astronaut in a white suit standing in a bright botanical greenhouse, vertical 9:16, 4k, high detail. ${"highly detailed textures, physically plausible lighting, realistic skin detail, cinematic composition, ultra crisp focus, depth-rich environment, high dynamic range, careful material response, atmospheric perspective, premium color grading, ".repeat(20)}`;
    const longPromptResult = await postJson(orchestratorUrl, "/api/image", {
      ...commonPayload,
      userId: "smoke-orchestrator-attestation-long-prompt",
      prompt: longPrompt,
      safetyProfile: buildAttestedSafetyProfile()
    });

    expectAttestedImageSuccess(longPromptResult, "long prompt clamp regression");
    expectPromptDoesNotUseNegativeLabel(longPromptResult, "long prompt clamp regression");
    expectImageRouteObservability(longPromptResult, "long prompt clamp regression");
    console.log("✓ orchestrator /api/image accepts long prompt and succeeds via provider-safe prompt handling");
  } else {
    console.log("• long prompt clamp regression check skipped (set ION_SMOKE_LONG_PROMPT=1 to enable)");
  }

  const dogRegression = await postJson(orchestratorUrl, "/api/image", {
    ...commonPayload,
    userId: "smoke-orchestrator-attestation-dog",
    prompt: "create an image of a photo realistic dog.",
    safetyProfile: buildAttestedSafetyProfile()
  });

  expectAttestedImageSuccess(dogRegression, "dog regression prompt");
  expectPromptDoesNotUseNegativeLabel(dogRegression, "dog regression prompt");
  expectImageRouteObservability(dogRegression, "dog regression prompt");
  console.log("✓ dog regression prompt no longer fails on false NSFW block");

  const warriorRegression = await postJson(orchestratorUrl, "/api/image", {
    ...commonPayload,
    userId: "smoke-orchestrator-attestation-warrior",
    prompt: "create an image of a ultra-detailed digital painting of a warrior",
    safetyProfile: buildAttestedSafetyProfile()
  });

  expectAttestedImageSuccess(warriorRegression, "warrior regression prompt");
  expectPromptDoesNotUseNegativeLabel(warriorRegression, "warrior regression prompt");
  expectImageRouteObservability(warriorRegression, "warrior regression prompt");
  console.log("✓ warrior regression prompt no longer fails on false NSFW block");
  console.log("✓ assembled prompt no longer emits 'negative:' label");
  console.log("Orchestrator image attestation smoke test passed.");
}

run().catch((error) => {
  console.error(
    "Orchestrator image attestation smoke test failed:",
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
});
