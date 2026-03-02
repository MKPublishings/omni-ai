const fs = require("fs");
const path = require("path");
const { loadTaskQueue } = require("../tools/taskTokenStore");

const ROOT = process.cwd();
const EVAL_DIR = path.join(ROOT, "data", "evaluations");
const BASELINE_LATEST = path.join(EVAL_DIR, "intelligence-baseline.latest.json");
const LOG_DIR = path.join(ROOT, "data", "logs");
const RUNTIME_SIGNAL_LOG = path.join(LOG_DIR, "runtime-signals.jsonl");
const RUNTIME_SIGNAL_MAX_LINES = 500;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function round3(value) {
  return Number(clamp(value).toFixed(3));
}

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getRiskSignals() {
  const tokens = loadTaskQueue();
  const openTokens = tokens.filter((token) => token?.status === "open" || token?.status === "in-progress");
  const highPriorityOpen = openTokens.filter((token) => String(token?.priority || "").toLowerCase() === "high").length;
  const inProgressOpen = openTokens.filter((token) => token?.status === "in-progress").length;
  const escalations = openTokens.filter((token) => String(token?.summary || "").toLowerCase().startsWith("escalation:")).length;

  const reopenCount = openTokens.reduce((sum, token) => {
    return sum + Number(token?.metadata?.reopenCount || 0);
  }, 0);

  return {
    openTokenCount: openTokens.length,
    highPriorityOpen,
    inProgressOpen,
    escalations,
    reopenCount
  };
}

function evaluateReadiness(baseline, risks) {
  const baselineScore = Number(baseline?.overallScore || 0);
  const thresholds = baseline?.thresholds || { healthy: 0.8, watch: 0.65 };

  const reliabilityScore = Number(baseline?.dimensions?.reliability || 0);
  const observabilityScore = Number(baseline?.dimensions?.observability || 0);

  const riskPenalty =
    risks.highPriorityOpen * 0.12 +
    risks.escalations * 0.12 +
    risks.reopenCount * 0.03 +
    (risks.inProgressOpen > 0 ? 0.04 : 0);

  const adjustedScore = round3(baselineScore - riskPenalty);

  let status = "red";
  if (
    adjustedScore >= Number(thresholds.healthy || 0.8) &&
    risks.highPriorityOpen === 0 &&
    risks.escalations === 0
  ) {
    status = "green";
  } else if (
    adjustedScore >= Number(thresholds.watch || 0.65) &&
    risks.highPriorityOpen <= 1 &&
    risks.escalations <= 1
  ) {
    status = "yellow";
  }

  const blockers = [];
  if (risks.highPriorityOpen > 0) blockers.push(`${risks.highPriorityOpen} open high-priority token(s)`);
  if (risks.escalations > 0) blockers.push(`${risks.escalations} escalation token(s)`);
  if (observabilityScore < 0.5) blockers.push("observability below target (runtime log coverage too low)");
  if (reliabilityScore < 0.65) blockers.push("reliability below watch threshold");

  const recommendations = [
    "Clear high-priority and escalation tokens before production ship.",
    "Increase runtime telemetry depth to improve observability confidence.",
    "Re-run `npm run mind:baseline` after fixes and verify readiness score trend."
  ];

  return {
    status,
    baselineScore: round3(baselineScore),
    adjustedScore,
    riskPenalty: round3(riskPenalty),
    thresholds: {
      healthy: Number(thresholds.healthy || 0.8),
      watch: Number(thresholds.watch || 0.65)
    },
    blockers,
    recommendations
  };
}

function toMarkdown(report) {
  const lines = [
    `# Omni Ship Readiness (${report.generatedAt})`,
    "",
    `- Status: **${String(report.readiness.status).toUpperCase()}**`,
    `- Baseline score: ${report.readiness.baselineScore}`,
    `- Adjusted score: ${report.readiness.adjustedScore}`,
    `- Risk penalty: ${report.readiness.riskPenalty}`,
    "",
    "## Risk Signals",
    "",
    `- Open tokens: ${report.risks.openTokenCount}`,
    `- High-priority open: ${report.risks.highPriorityOpen}`,
    `- In-progress open: ${report.risks.inProgressOpen}`,
    `- Escalations: ${report.risks.escalations}`,
    `- Reopen count: ${report.risks.reopenCount}`,
    "",
    "## Blockers",
    ""
  ];

  if (report.readiness.blockers.length) {
    for (const blocker of report.readiness.blockers) {
      lines.push(`- ${blocker}`);
    }
  } else {
    lines.push("- None");
  }

  lines.push("", "## Recommendations", "");
  for (const recommendation of report.readiness.recommendations) {
    lines.push(`- ${recommendation}`);
  }

  return `${lines.join("\n")}\n`;
}

function writeOutputs(report) {
  fs.mkdirSync(EVAL_DIR, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, "-");

  const jsonFile = path.join(EVAL_DIR, `intelligence-ship-readiness-${stamp}.json`);
  const latestJsonFile = path.join(EVAL_DIR, "intelligence-ship-readiness.latest.json");
  const mdFile = path.join(EVAL_DIR, `intelligence-ship-readiness-${stamp}.md`);
  const latestMdFile = path.join(EVAL_DIR, "intelligence-ship-readiness.latest.md");

  fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(latestJsonFile, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(mdFile, toMarkdown(report), "utf8");
  fs.writeFileSync(latestMdFile, toMarkdown(report), "utf8");

  return { jsonFile, latestJsonFile, mdFile, latestMdFile };
}

function appendRuntimeSignal(report) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const line = JSON.stringify({
    ts: report.generatedAt,
    type: "ship-readiness",
    status: report.readiness.status,
    baselineScore: report.readiness.baselineScore,
    adjustedScore: report.readiness.adjustedScore,
    riskPenalty: report.readiness.riskPenalty,
    openTokenCount: report.risks.openTokenCount,
    highPriorityOpen: report.risks.highPriorityOpen,
    escalations: report.risks.escalations,
    strict: report.strict
  });

  const existingLines = fs.existsSync(RUNTIME_SIGNAL_LOG)
    ? fs
        .readFileSync(RUNTIME_SIGNAL_LOG, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
    : [];

  const nextLines = [...existingLines, line];
  const trimmed = nextLines.slice(-RUNTIME_SIGNAL_MAX_LINES);
  const payload = trimmed.length ? `${trimmed.join("\n")}\n` : "";
  fs.writeFileSync(RUNTIME_SIGNAL_LOG, payload, "utf8");
}

function main() {
  const strict = process.argv.includes("--strict");
  const baseline = safeReadJson(BASELINE_LATEST);

  if (!baseline) {
    console.error("Ship readiness failed: missing baseline report. Run `npm run mind:baseline` first.");
    process.exitCode = 1;
    return;
  }

  const risks = getRiskSignals();
  const readiness = evaluateReadiness(baseline, risks);

  const report = {
    generatedAt: new Date().toISOString(),
    kind: "omni-intelligence-ship-readiness",
    version: "v1",
    baselineRef: path.relative(ROOT, BASELINE_LATEST).replace(/\\/g, "/"),
    baselineGeneratedAt: String(baseline.generatedAt || ""),
    baselineDimensions: baseline.dimensions || {},
    risks,
    readiness,
    strict
  };

  const files = writeOutputs(report);
  appendRuntimeSignal(report);

  console.log("Omni ship readiness check complete.");
  console.log(`Status: ${readiness.status.toUpperCase()}`);
  console.log(`Adjusted score: ${readiness.adjustedScore}`);
  console.log(`Readiness report: ${files.latestJsonFile}`);

  if (strict && readiness.status !== "green") {
    console.error("Strict readiness gate failed: status is not GREEN.");
    process.exitCode = 1;
  }
}

main();
