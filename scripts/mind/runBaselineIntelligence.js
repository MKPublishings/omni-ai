const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TOKENS_PATH = path.join(ROOT, "data", "sessions", "task-tokens.jsonl");
const EVAL_DIR = path.join(ROOT, "data", "evaluations");
const DECISIONS_DIR = path.join(ROOT, "codex", "40-decisions");
const LOG_DIR = path.join(ROOT, "data", "logs");

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function round3(value) {
  return Number(clamp(value).toFixed(3));
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJsonl(filePath) {
  const raw = safeRead(filePath);
  if (!raw.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getDecisionFiles() {
  if (!fs.existsSync(DECISIONS_DIR)) return [];
  return fs
    .readdirSync(DECISIONS_DIR)
    .filter((name) => /-decision-log\.md$/i.test(name))
    .map((name) => path.join(DECISIONS_DIR, name));
}

function readDecisionSnapshots() {
  const files = getDecisionFiles();
  const snapshots = [];

  for (const filePath of files) {
    const raw = safeRead(filePath);
    if (!raw.trim()) continue;
    const monitoringCount = (raw.match(/mind-loop-monitoring/gi) || []).length;
    const improvementCount = (raw.match(/mind-loop-improvement/gi) || []).length;
    snapshots.push({
      file: path.basename(filePath),
      monitoringCount,
      improvementCount
    });
  }

  return snapshots;
}

function latestLogSample() {
  if (!fs.existsSync(LOG_DIR)) {
    return {
      exists: false,
      latestFile: null,
      sampleSize: 0
    };
  }

  const files = fs
    .readdirSync(LOG_DIR)
    .filter((name) => /\.(jsonl|json|log|txt)$/i.test(name))
    .map((name) => {
      const fullPath = path.join(LOG_DIR, name);
      return {
        fullPath,
        name,
        mtimeMs: fs.statSync(fullPath).mtimeMs
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const latest = files[0];
  if (!latest) {
    return {
      exists: true,
      latestFile: null,
      sampleSize: 0
    };
  }

  const raw = safeRead(latest.fullPath);
  const sampleSize = raw.split(/\r?\n/).filter(Boolean).length;
  return {
    exists: true,
    latestFile: latest.name,
    sampleSize
  };
}

function deriveSignals() {
  const taskTokens = readJsonl(TOKENS_PATH);
  const openTokens = taskTokens.filter((token) => token.status === "open" || token.status === "in-progress");
  const openHigh = openTokens.filter((token) => String(token.priority || "").toLowerCase() === "high").length;
  const openLow = openTokens.filter((token) => String(token.priority || "").toLowerCase() === "low").length;
  const escalations = openTokens.filter((token) => String(token.summary || "").toLowerCase().startsWith("escalation:")).length;

  const reopenCount = openTokens.reduce((sum, token) => {
    return sum + Number(token?.metadata?.reopenCount || 0);
  }, 0);

  const decisionSnapshots = readDecisionSnapshots();
  const monitoringSnapshots = decisionSnapshots.reduce((sum, item) => sum + item.monitoringCount, 0);
  const improvementSnapshots = decisionSnapshots.reduce((sum, item) => sum + item.improvementCount, 0);

  const logSample = latestLogSample();

  const srcIndex = safeRead(path.join(ROOT, "src", "index.ts"));
  const chatScript = safeRead(path.join(ROOT, "public", "scripts", "chat.js"));

  const hasModeAutoRouting = /detectAutoModeFromText|detectModeFromContent/.test(chatScript);
  const hasLegalSafety = /evaluateLegalAttestation/.test(srcIndex);
  const hasPromptSafety = /evaluateSexualSafetyPrompt/.test(srcIndex);
  const hasImageFallbackRetry = /fallbackUsed\s*=\s*true/.test(srcIndex);
  const hasMemoryEndpoint = /\/api\/memory/.test(srcIndex) || /\/api\/memory/.test(chatScript);

  return {
    taskTokens,
    openTokens,
    openHigh,
    openLow,
    escalations,
    reopenCount,
    decisionSnapshots,
    monitoringSnapshots,
    improvementSnapshots,
    logSample,
    hasModeAutoRouting,
    hasLegalSafety,
    hasPromptSafety,
    hasImageFallbackRetry,
    hasMemoryEndpoint
  };
}

function scoreDimensions(signals) {
  const reasoning = clamp(0.55 + (signals.hasModeAutoRouting ? 0.2 : 0) + (signals.hasImageFallbackRetry ? 0.1 : 0));
  const memory = clamp(0.5 + (signals.hasMemoryEndpoint ? 0.2 : 0) - signals.openHigh * 0.03);
  const safety = clamp(0.55 + (signals.hasLegalSafety ? 0.2 : 0) + (signals.hasPromptSafety ? 0.2 : 0) - signals.escalations * 0.02);
  const reliability = clamp(0.8 - signals.openHigh * 0.12 - signals.escalations * 0.08 - signals.reopenCount * 0.03 + signals.monitoringSnapshots * 0.01);

  const telemetryEvidence = clamp(
    (signals.logSample.sampleSize > 0 ? 0.6 : 0) +
      (signals.monitoringSnapshots > 0 || signals.improvementSnapshots > 0 ? 0.25 : 0) +
      (signals.taskTokens.length > 0 ? 0.15 : 0)
  );

  const dimensions = {
    reasoning: round3(reasoning),
    memory: round3(memory),
    safety: round3(safety),
    reliability: round3(reliability),
    observability: round3(telemetryEvidence)
  };

  const weights = {
    reasoning: 0.25,
    memory: 0.2,
    safety: 0.2,
    reliability: 0.25,
    observability: 0.1
  };

  const score = round3(
    dimensions.reasoning * weights.reasoning +
      dimensions.memory * weights.memory +
      dimensions.safety * weights.safety +
      dimensions.reliability * weights.reliability +
      dimensions.observability * weights.observability
  );

  return { dimensions, weights, score };
}

function buildFindings(signals, scoring) {
  const findings = [];

  findings.push(
    scoring.score >= 0.8
      ? "Baseline score is in healthy range; continue incremental hardening."
      : "Baseline score is below target and needs reliability/quality hardening."
  );

  if (signals.logSample.sampleSize === 0) {
    findings.push("No runtime log sample found; observability confidence is limited.");
  } else {
    findings.push(`Runtime log sample detected (${signals.logSample.sampleSize} lines).`);
  }

  if (signals.openHigh > 0) {
    findings.push(`There are ${signals.openHigh} open high-priority task token(s), suppressing reliability.`);
  }

  if (signals.escalations > 0) {
    findings.push(`Detected ${signals.escalations} open escalation token(s), indicating recurring execution debt.`);
  }

  if (signals.hasModeAutoRouting) {
    findings.push("Mode auto-routing heuristics are present and contributing to reasoning baseline.");
  }

  if (signals.hasLegalSafety && signals.hasPromptSafety) {
    findings.push("Safety controls include legal attestation and prompt policy enforcement layers.");
  }

  return findings;
}

function writeScorecard(payload) {
  fs.mkdirSync(EVAL_DIR, { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const reportFile = path.join(EVAL_DIR, `intelligence-baseline-${timestamp}.json`);
  const latestFile = path.join(EVAL_DIR, "intelligence-baseline.latest.json");

  fs.writeFileSync(reportFile, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(latestFile, JSON.stringify(payload, null, 2), "utf8");

  return { reportFile, latestFile };
}

function main() {
  const signals = deriveSignals();
  const scoring = scoreDimensions(signals);
  const findings = buildFindings(signals, scoring);

  const payload = {
    generatedAt: new Date().toISOString(),
    kind: "omni-intelligence-baseline",
    version: "v1",
    overallScore: scoring.score,
    dimensions: scoring.dimensions,
    weights: scoring.weights,
    thresholds: {
      healthy: 0.8,
      watch: 0.65
    },
    signals: {
      logSample: signals.logSample,
      openTokenCount: signals.openTokens.length,
      openHighPriorityTokens: signals.openHigh,
      openLowPriorityTokens: signals.openLow,
      escalationTokens: signals.escalations,
      reopenCount: signals.reopenCount,
      monitoringSnapshots: signals.monitoringSnapshots,
      improvementSnapshots: signals.improvementSnapshots,
      capabilities: {
        modeAutoRouting: signals.hasModeAutoRouting,
        memoryEndpoint: signals.hasMemoryEndpoint,
        legalSafetyLayer: signals.hasLegalSafety,
        promptSafetyLayer: signals.hasPromptSafety,
        imageFallbackRetry: signals.hasImageFallbackRetry
      }
    },
    findings,
    recommendedNextActions: [
      "Instrument runtime logs under data/logs to increase observability confidence.",
      "Resolve open high-priority/escalation task tokens to recover reliability score.",
      "Use this baseline as Part 1 reference before Part 2 reasoning/memory upgrades."
    ]
  };

  const files = writeScorecard(payload);

  console.log("Omni intelligence baseline complete.");
  console.log(`Overall score: ${payload.overallScore}`);
  console.log(`Dimensions: ${JSON.stringify(payload.dimensions)}`);
  console.log(`Report: ${files.reportFile}`);
  console.log(`Latest: ${files.latestFile}`);
}

main();
