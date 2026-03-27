const DEFAULT_URL = process.env.ION_CHAT_BENCH_URL || "http://127.0.0.1:8787/api/ION";
const RUNS = Number(process.env.ION_CHAT_BENCH_RUNS || 15);
const WARMUP = Number(process.env.ION_CHAT_BENCH_WARMUP || 3);
const MODE = process.env.ION_CHAT_BENCH_MODE || "auto";
const FAST = String(process.env.ION_CHAT_BENCH_FAST || "false").toLowerCase() === "true";

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function toMs(startNs) {
  return Number(process.hrtime.bigint() - startNs) / 1e6;
}

async function runOnce(index) {
  const startedNs = process.hrtime.bigint();
  const response = await fetch(DEFAULT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mode: MODE,
      fastMode: FAST,
      safetyProfile: {
        ageTier: "adult",
        explicitAllowed: true,
        illegalBlocked: true,
        legalAttestation: {
          accepted: true,
          jurisdiction: "US",
          truthfulIdentity: true,
          lawfulUse: true,
          userDirected: true,
          acceptedAt: Date.now()
        }
      },
      messages: [
        { role: "user", content: "Give me one practical optimization for fast chat response time." }
      ]
    })
  });

  const headerMs = toMs(startedNs);
  const prestreamHeader = Number(response.headers.get("x-ION-prestream-latency-ms") || 0);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Run ${index} failed with ${response.status}: ${text.slice(0, 200)}`);
  }

  if (!response.body) {
    return {
      ttfbMs: headerMs,
      firstTokenMs: headerMs,
      fullMs: toMs(startedNs),
      prestreamMs: prestreamHeader
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let firstTokenMs = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    if (!firstTokenMs && /data:\s*(?!\[DONE\])/i.test(chunk)) {
      firstTokenMs = toMs(startedNs);
    }
  }

  const fullMs = toMs(startedNs);
  return {
    ttfbMs: headerMs,
    firstTokenMs: firstTokenMs || headerMs,
    fullMs,
    prestreamMs: prestreamHeader
  };
}

async function main() {
  console.log(`Target: ${DEFAULT_URL}`);
  console.log(`Mode: ${MODE} | Fast: ${FAST} | Warmup: ${WARMUP} | Runs: ${RUNS}`);

  for (let i = 0; i < WARMUP; i += 1) {
    await runOnce(i + 1);
  }

  const samples = [];
  for (let i = 0; i < RUNS; i += 1) {
    const sample = await runOnce(i + 1);
    samples.push(sample);
    console.log(
      `[${i + 1}/${RUNS}] ttfb=${sample.ttfbMs.toFixed(1)}ms firstToken=${sample.firstTokenMs.toFixed(1)}ms full=${sample.fullMs.toFixed(1)}ms prestream=${sample.prestreamMs.toFixed(1)}ms`
    );
  }

  const ttfb = samples.map((s) => s.ttfbMs);
  const firstToken = samples.map((s) => s.firstTokenMs);
  const full = samples.map((s) => s.fullMs);
  const prestream = samples.map((s) => s.prestreamMs).filter((v) => Number.isFinite(v) && v > 0);

  console.log("\nSummary:");
  console.log(`ttfb p50=${percentile(ttfb, 50).toFixed(1)}ms p95=${percentile(ttfb, 95).toFixed(1)}ms avg=${mean(ttfb).toFixed(1)}ms`);
  console.log(`firstToken p50=${percentile(firstToken, 50).toFixed(1)}ms p95=${percentile(firstToken, 95).toFixed(1)}ms avg=${mean(firstToken).toFixed(1)}ms`);
  console.log(`full p50=${percentile(full, 50).toFixed(1)}ms p95=${percentile(full, 95).toFixed(1)}ms avg=${mean(full).toFixed(1)}ms`);
  if (prestream.length) {
    console.log(`prestream(header) p50=${percentile(prestream, 50).toFixed(1)}ms p95=${percentile(prestream, 95).toFixed(1)}ms avg=${mean(prestream).toFixed(1)}ms`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
