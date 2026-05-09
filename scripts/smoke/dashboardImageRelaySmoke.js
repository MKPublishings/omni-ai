const DEFAULT_DASHBOARD_URL = "https://dashboard-ionirix.vercel.app";
const DASHBOARD_URL = String(process.env.ION_DASHBOARD_URL || DEFAULT_DASHBOARD_URL).replace(/\/+$/, "");
const DASHBOARD_FALLBACK_URLS = String(process.env.ION_DASHBOARD_FALLBACK_URLS || "")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const REQUEST_TIMEOUT_MS = Number(process.env.ION_SMOKE_TIMEOUT_MS || 90_000);
const FETCH_RETRIES = Math.max(1, Number(process.env.ION_SMOKE_FETCH_RETRIES || 3));
const FETCH_RETRY_DELAY_MS = Math.max(100, Number(process.env.ION_SMOKE_FETCH_RETRY_DELAY_MS || 1_250));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function buildCandidateUrls() {
  return Array.from(new Set([DASHBOARD_URL, ...DASHBOARD_FALLBACK_URLS].filter(Boolean)));
}

async function resolveReachableDashboardUrl() {
  const errors = [];
  for (const candidate of buildCandidateUrls()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, 8_000));
    try {
      await fetch(`${candidate}/`, {
        method: "GET",
        headers: { Accept: "text/html,application/json,*/*" },
        signal: controller.signal,
      });
      return candidate;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${candidate} -> ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`No reachable dashboard endpoint. Attempts: ${errors.join(" | ")}`);
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
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
        rawText: text,
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

function expectRelaySuccess(result, label) {
  expect(result.status === 200, `${label}: expected status 200, got ${result.status}`);
  expect(result.data && typeof result.data === "object", `${label}: expected JSON response object`);
  expect(
    typeof result.data.imageDataUrl === "string" && result.data.imageDataUrl.startsWith("data:image/"),
    `${label}: expected imageDataUrl data URI`
  );
  expect(String(result.headers.get("X-ION-Image-Route") || "") === "image-gen-v2", `${label}: expected X-ION-Image-Route=image-gen-v2`);
  expect(String(result.data?.metadata?.pipeline?.gateway || "").length > 0, `${label}: expected pipeline gateway metadata`);
}

async function run() {
  const dashboardUrl = await resolveReachableDashboardUrl();
  console.log(`• using dashboard endpoint: ${dashboardUrl}`);

  const result = await postJson(dashboardUrl, "/api/image", {
    userId: "smoke-dashboard-relay",
    prompt: "Photorealistic portrait of a smiling astronaut in a bright botanical greenhouse, vertical 9:16, high detail",
    mode: "simple",
    quality: "ultra",
    ratio: "9:16",
    width: 2160,
    height: 3840,
  });

  expectRelaySuccess(result, "dashboard image relay");
  console.log(`✓ dashboard /api/image direct relay returned ${result.status}`);
  console.log(`• route header: ${String(result.headers.get("X-ION-Image-Route") || "(missing)")}`);
  console.log(`• gateway: ${String(result.data?.metadata?.pipeline?.gateway || "(missing)")}`);
}

run().catch((error) => {
  console.error("Dashboard image relay smoke test failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});