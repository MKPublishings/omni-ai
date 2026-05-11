const DEFAULT_WORKER_URL = "https://ionirix.com";
const DEFAULT_DASHBOARD_URL = "https://dashboard-ionirix.vercel.app";
const DEFAULT_ION_HOST = "https://worker-ion.ionirix.com";

const WORKER_URL = String(process.env.ION_ORCHESTRATOR_URL || DEFAULT_WORKER_URL).replace(/\/+$/, "");
const DASHBOARD_URL = String(process.env.ION_DASHBOARD_URL || DEFAULT_DASHBOARD_URL).replace(/\/+$/, "");
const ion_HOST = String(process.env.ION_HOST || DEFAULT_ION_HOST).replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = Number(process.env.ION_SMOKE_TIMEOUT_MS || 90_000);
const REQUIRE_WORKER_SUCCESS = ["1", "true", "yes", "on"].includes(
  String(process.env.ION_VALIDATOR_REQUIRE_WORKER || "").trim().toLowerCase()
);

function truncate(value, length = 180) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

async function request(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
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
      headers: response.headers,
    };
  } catch (error) {
    return {
      ok: false,
      status: -1,
      text: error instanceof Error ? error.message : String(error),
      data: null,
      headers: new Headers(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function printResult(label, result, details = "") {
  const suffix = details ? ` | ${details}` : "";
  console.log(`${label}: status=${result.status}${suffix}`);
}

async function run() {
  console.log(`• worker url: ${WORKER_URL}`);
  console.log(`• dashboard url: ${DASHBOARD_URL}`);
  console.log(`• ion host: ${ion_HOST}`);

  const queueResult = await request(`${ion_HOST}/queue`, { method: "GET" });
  printResult("ion queue", queueResult, truncate(queueResult.text));

  const promptPayload = {
    prompt: {
      "1": {
        inputs: { ckpt_name: "ion-citizen-xl-vpred-v2.0" },
        class_type: "CheckpointLoaderSimple",
      },
    },
  };
  const promptResult = await request(`${ion_HOST}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(promptPayload),
  });
  printResult("ion prompt", promptResult, truncate(promptResult.text));

  const dashboardPayload = {
    userId: "validator-dashboard-relay",
    prompt: "simple photo of a dog",
    mode: "simple",
    quality: "ultra",
    width: 1024,
    height: 1536,
  };
  const dashboardResult = await request(`${DASHBOARD_URL}/api/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dashboardPayload),
  });
  printResult(
    "dashboard relay",
    dashboardResult,
    `route=${String(dashboardResult.headers.get("X-ION-Image-Route") || "(missing)")} body=${truncate(dashboardResult.text)}`
  );

  const workerPayload = {
    userId: "validator-worker-path",
    prompt: "simple photo of a dog",
    width: 1024,
    height: 1536,
  };
  const workerResult = await request(`${WORKER_URL}/api/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(workerPayload),
  });
  printResult(
    "worker image route",
    workerResult,
    `route=${String(workerResult.headers.get("X-ION-Image-Route") || "(missing)")} body=${truncate(workerResult.text)}`
  );

  let failed = false;
  if (queueResult.status !== 200) {
    failed = true;
    console.error("✖ ion GET /queue is not healthy.");
  }
  if (![200, 400].includes(promptResult.status)) {
    failed = true;
    console.error("✖ ion POST /prompt did not reach the origin as expected.");
  }
  if (dashboardResult.status !== 200) {
    failed = true;
    console.error("✖ Dashboard relay path is not healthy.");
  }
  if (REQUIRE_WORKER_SUCCESS && workerResult.status !== 200) {
    failed = true;
    console.error("✖ Worker image route is required to succeed but did not.");
  }
  if (!REQUIRE_WORKER_SUCCESS && workerResult.status !== 200) {
    console.warn("• Worker image route is still failing, which is currently expected while the dashboard relay bypass is active.");
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log("✓ relay path validation complete");
}

run().catch((error) => {
  console.error("Relay path validation failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});