const ORCHESTRATOR_URL =
  String(process.env.OMNI_ORCHESTRATOR_URL || "https://omni-ai.omni-ai.workers.dev").replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = Number(process.env.OMNI_SMOKE_TIMEOUT_MS || 90_000);

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function postJson(path, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${ORCHESTRATOR_URL}${path}`, {
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

    return {
      status: response.status,
      headers: response.headers,
      data,
      rawText: text
    };
  } finally {
    clearTimeout(timeout);
  }
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

  const modelHeader = String(result.headers.get("X-Omni-Image-Model") || "").trim();
  expect(modelHeader.length > 0, `${label}: expected X-Omni-Image-Model header`);
}

function expectPromptDoesNotUseNegativeLabel(result, label) {
  const finalPrompt = String(result?.data?.metadata?.prompt?.finalPrompt || "");
  expect(finalPrompt.length > 0, `${label}: expected metadata.prompt.finalPrompt`);
  expect(!/\bnegative\s*:/i.test(finalPrompt), `${label}: finalPrompt must not include 'negative:' label`);
}

async function run() {
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

  const unattested = await postJson("/api/image", {
    ...commonPayload,
    prompt: "Photorealistic portrait of an astronaut in a greenhouse, vertical 9:16, high detail"
  });

  expect(unattested.status === 403, `expected unattested status 403, got ${unattested.status}`);
  expect(
    String(unattested.data?.code || "") === "legal-attestation-required",
    `expected unattested code legal-attestation-required, got ${String(unattested.data?.code || "(missing)")}`
  );
  console.log("✓ orchestrator legal gate blocks unattested /api/image requests");

  const attested = await postJson("/api/image", {
    ...commonPayload,
    prompt: "Photorealistic portrait of a smiling astronaut in a white suit standing in a bright botanical greenhouse, vertical 9:16, 4k, high detail",
    safetyProfile: buildAttestedSafetyProfile()
  });

  expectAttestedImageSuccess(attested, "attested baseline prompt");
  expectPromptDoesNotUseNegativeLabel(attested, "attested baseline prompt");
  console.log("✓ orchestrator /api/image returns attested image payload with metadata");

  const dogRegression = await postJson("/api/image", {
    ...commonPayload,
    userId: "smoke-orchestrator-attestation-dog",
    prompt: "create an image of a photo realistic dog.",
    safetyProfile: buildAttestedSafetyProfile()
  });

  expectAttestedImageSuccess(dogRegression, "dog regression prompt");
  expectPromptDoesNotUseNegativeLabel(dogRegression, "dog regression prompt");
  console.log("✓ dog regression prompt no longer fails on false NSFW block");

  const warriorRegression = await postJson("/api/image", {
    ...commonPayload,
    userId: "smoke-orchestrator-attestation-warrior",
    prompt: "create an image of a ultra-detailed digital painting of a warrior",
    safetyProfile: buildAttestedSafetyProfile()
  });

  expectAttestedImageSuccess(warriorRegression, "warrior regression prompt");
  expectPromptDoesNotUseNegativeLabel(warriorRegression, "warrior regression prompt");
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
