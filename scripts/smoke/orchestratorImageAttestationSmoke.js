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

  expect(attested.status === 200, `expected attested status 200, got ${attested.status}`);
  expect(attested.data && typeof attested.data === "object", "expected JSON response object for attested request");
  expect(
    typeof attested.data.imageDataUrl === "string" && attested.data.imageDataUrl.startsWith("data:image/"),
    "expected imageDataUrl data URI in attested response"
  );
  expect(typeof attested.data.filename === "string" && attested.data.filename.length > 0, "expected filename in attested response");
  expect(attested.data.metadata && typeof attested.data.metadata === "object", "expected metadata object in attested response");

  const modelHeader = String(attested.headers.get("X-Omni-Image-Model") || "").trim();
  expect(modelHeader.length > 0, "expected X-Omni-Image-Model response header");

  console.log("✓ orchestrator /api/image returns attested image payload with metadata");
  console.log("Orchestrator image attestation smoke test passed.");
}

run().catch((error) => {
  console.error(
    "Orchestrator image attestation smoke test failed:",
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
});
