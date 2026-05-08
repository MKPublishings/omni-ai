const fs = require("node:fs");
const path = require("node:path");
const {
  filterGeneratedDeploymentArtifacts,
  resolveExistingGeneratedDeploymentRoots,
  toPosix
} = require("../shared/generatedArtifactPolicy");

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, "data", "logs");
const REPORT_BASENAME = "image-forensics-sweep";

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".json",
  ".md",
  ".html",
  ".css",
  ".py",
  ".toml",
  ".yml",
  ".yaml",
  ".cjs",
  ".mjs"
]);

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".wrangler",
  ".venv",
  "dist",
  "build",
  "coverage",
  "__pycache__"
]);

const PIPELINE_HINTS = [
  "image",
  "prompt",
  "router",
  "model",
  "export",
  "r2",
  "kv",
  "d1",
  "worker"
];

const PROMPT_PATTERNS = [
  /prompt\s*:/i,
  /negative_?prompt\s*:/i,
  /style\s*:/i,
  /quality\s*:/i,
  /cfg_?scale/i,
  /guidance/i,
  /steps/i,
  /sampler/i,
  /tags?\s*:/i
];

const SUSPICIOUS_DEFAULT_PATTERNS = [
  /\bmoon\b/i,
  /\bocean\b/i,
  /\bnight\s*sky\b/i
];

const INFERENCE_PATTERNS = [
  /fetch\(/i,
  /JSON\.stringify\(/i,
  /model\s*:/i,
  /input\s*:/i,
  /prompt\s*:/i
];

const EXPORT_PATTERNS = [
  /\br2\.put\(/i,
  /\bput\(/i,
  /contentType/i,
  /image\/(png|jpeg|jpg|webp)/i,
  /arrayBuffer\(/i,
  /blob\(/i,
  /base64/i,
  /writeFile\(/i
];

const FRONTEND_PATTERNS = [
  /<img/i,
  /image_url/i,
  /imageDataUrl/i,
  /cdn-cgi/i,
  /cache/i,
  /transform/i
];

const IMAGE_RELEVANT_ROOTS = [
  "ION-image-engine/",
  "workers/ION-ai-images/",
  "src/index.ts",
  "scripts/shared/chatClientRuntime.js",
  "scripts/smoke/image",
  "ION_media/"
];

const STRICT_IMAGE_RELEVANT_ROOTS = [
  "ION-image-engine/",
  "workers/ION-ai-images/",
  "src/index.ts",
  "scripts/shared/chatClientRuntime.js",
  "scripts/smoke/image"
];

const EXCLUDE_PATH_HINTS = [
  "data/logs/image-forensics-sweep",
  "scripts/tools/runimageforensicssweep.js"
];

const PROMPT_TRUNCATION_PATTERNS = [
  /prompt[^\n]*\.slice\(\s*0\s*,\s*\d+\s*\)/i,
  /prompt[^\n]*\.substring\(\s*0\s*,\s*\d+\s*\)/i,
  /prompt[^\n]*\.substr\(\s*0\s*,\s*\d+\s*\)/i,
  /finalPrompt[^\n]*\.slice\(\s*0\s*,\s*\d+\s*\)/i,
  /userPrompt[^\n]*\.slice\(\s*0\s*,\s*\d+\s*\)/i
];

function listFilesRecursive(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      if (entry.name !== ".github") continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      out.push(...listFilesRecursive(fullPath));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    out.push(fullPath);
  }

  return out;
}

function readTextSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function collectPatternMatches(relPath, text, patterns) {
  const lines = text.split(/\r?\n/);
  const matches = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        matches.push({
          file: relPath,
          line: i + 1,
          snippet: line.trim().slice(0, 220)
        });
        break;
      }
    }
  }

  return matches;
}

function scoreRisk(report) {
  let score = 0;

  if (report.summary.suspiciousDefaults > 0) score += 25;
  if (report.summary.writeWithoutGuard > 0) score += 20;
  if (report.summary.promptFieldsFound === 0) score += 20;
  if (report.summary.promptTruncationSignals > 0) score += 15;
  if (report.summary.inferencePayloadSignals === 0) score += 20;
  if (report.summary.exportSignals === 0) score += 15;

  return Math.min(100, score);
}

function isImageRelevantPath(relPath, strictMode) {
  const lower = relPath.toLowerCase();
  if (EXCLUDE_PATH_HINTS.some((hint) => lower.includes(hint))) {
    return false;
  }
  const roots = strictMode ? STRICT_IMAGE_RELEVANT_ROOTS : IMAGE_RELEVANT_ROOTS;
  return roots.some((root) => lower.startsWith(root));
}

function gatherForensics(options = {}) {
  const strictMode = options.strictMode === true;
  const includeBuildOutput = options.includeBuildOutput === true;
  const allFiles = listFilesRecursive(ROOT);
  const candidateFiles = filterGeneratedDeploymentArtifacts(ROOT, allFiles, { includeBuildOutput });
  const excludedGeneratedRoots = resolveExistingGeneratedDeploymentRoots(ROOT);
  const pipelineFiles = [];
  const promptMatches = [];
  const suspiciousDefaults = [];
  const inferenceSignals = [];
  const exportSignals = [];
  const frontendSignals = [];
  const writeWithoutGuard = [];
  const promptTruncationSignals = [];

  for (const filePath of candidateFiles) {
    const relPath = toPosix(path.relative(ROOT, filePath));
    const lowerPath = relPath.toLowerCase();
    const text = readTextSafe(filePath);
    if (!text) continue;

    const isImageRelevant = isImageRelevantPath(relPath, strictMode);
    if (!isImageRelevant) {
      continue;
    }

    const isPipelinePath = PIPELINE_HINTS.some((hint) => lowerPath.includes(hint));
    if (isPipelinePath) {
      pipelineFiles.push(relPath);
    }

    const promptHits = collectPatternMatches(relPath, text, PROMPT_PATTERNS);
    if (promptHits.length) promptMatches.push(...promptHits);

    const suspiciousHits = collectPatternMatches(relPath, text, SUSPICIOUS_DEFAULT_PATTERNS);
    if (suspiciousHits.length) suspiciousDefaults.push(...suspiciousHits);

    const inferenceHits = collectPatternMatches(relPath, text, INFERENCE_PATTERNS);
    if (inferenceHits.length) inferenceSignals.push(...inferenceHits);

    const exportHits = collectPatternMatches(relPath, text, EXPORT_PATTERNS);
    if (exportHits.length) exportSignals.push(...exportHits);

    const frontendHits = collectPatternMatches(relPath, text, FRONTEND_PATTERNS);
    if (frontendHits.length && lowerPath.startsWith("public/")) frontendSignals.push(...frontendHits);

    const truncationHits = collectPatternMatches(relPath, text, PROMPT_TRUNCATION_PATTERNS);
    if (truncationHits.length) promptTruncationSignals.push(...truncationHits);

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!/writeFile\(/i.test(line)) continue;

      if (/writeFile\([^\)]*prepared\.buffer/i.test(line) && /function\s+prepareExportPayload/i.test(text)) {
        continue;
      }

      const neighborhood = lines.slice(Math.max(0, i - 8), Math.min(lines.length, i + 3)).join("\n");
      const hasLengthGuard = /length\s*[<>!=]=?|byteLength\s*[<>!=]=?|empty payload|toNonEmptyBuffer/i.test(neighborhood);
      if (!hasLengthGuard) {
        writeWithoutGuard.push({ file: relPath, line: i + 1, snippet: line.trim().slice(0, 220) });
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    root: toPosix(ROOT),
    strictMode,
    includeBuildOutput,
    excludedGeneratedRoots,
    summary: {
      filesScanned: candidateFiles.length,
      generatedBuildFilesExcluded: allFiles.length - candidateFiles.length,
      pipelineFiles: pipelineFiles.length,
      promptFieldsFound: promptMatches.length,
      suspiciousDefaults: suspiciousDefaults.length,
      promptTruncationSignals: promptTruncationSignals.length,
      inferencePayloadSignals: inferenceSignals.length,
      exportSignals: exportSignals.length,
      frontendSignals: frontendSignals.length,
      writeWithoutGuard: writeWithoutGuard.length
    },
    riskScore: 0,
    findings: {
      pipelineFiles: pipelineFiles.slice(0, 400),
      promptMatches: promptMatches.slice(0, 400),
      suspiciousDefaults: suspiciousDefaults.slice(0, 200),
      promptTruncationSignals: promptTruncationSignals.slice(0, 200),
      inferenceSignals: inferenceSignals.slice(0, 400),
      exportSignals: exportSignals.slice(0, 400),
      frontendSignals: frontendSignals.slice(0, 300),
      writeWithoutGuard: writeWithoutGuard.slice(0, 200)
    }
  };

  report.riskScore = scoreRisk(report);
  return report;
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# ION Image Forensics Sweep");
  lines.push("");
  lines.push("> Generated report. Treat `scripts/tools/runImageForensicsSweep.js` as the policy source and this latest markdown as the operator-facing derived artifact.");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Risk Score: ${report.riskScore}/100`);
  lines.push(`Mode: ${report.strictMode ? "strict" : "standard"}`);
  lines.push(`Generated deployment roots included: ${report.includeBuildOutput ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Files scanned: ${report.summary.filesScanned}`);
  lines.push(`- Generated deployment files excluded: ${report.summary.generatedBuildFilesExcluded}`);
  if (Array.isArray(report.excludedGeneratedRoots) && report.excludedGeneratedRoots.length > 0) {
    lines.push(`- Excluded generated roots: ${report.excludedGeneratedRoots.join(", ")}`);
  }
  lines.push(`- Pipeline files: ${report.summary.pipelineFiles}`);
  lines.push(`- Prompt-field matches: ${report.summary.promptFieldsFound}`);
  lines.push(`- Suspicious default matches (moon/ocean/night sky): ${report.summary.suspiciousDefaults}`);
  lines.push(`- Prompt truncation signals: ${report.summary.promptTruncationSignals}`);
  lines.push(`- Inference payload signals: ${report.summary.inferencePayloadSignals}`);
  lines.push(`- Export signals: ${report.summary.exportSignals}`);
  lines.push(`- Frontend image signals: ${report.summary.frontendSignals}`);
  lines.push(`- writeFile calls missing nearby byte guards: ${report.summary.writeWithoutGuard}`);
  lines.push("");

  const sections = [
    ["Suspicious Defaults", report.findings.suspiciousDefaults],
    ["Prompt Truncation Signals", report.findings.promptTruncationSignals],
    ["Write Without Guard", report.findings.writeWithoutGuard],
    ["Prompt Matches", report.findings.promptMatches],
    ["Inference Signals", report.findings.inferenceSignals],
    ["Export Signals", report.findings.exportSignals],
    ["Frontend Signals", report.findings.frontendSignals]
  ];

  for (const [title, items] of sections) {
    lines.push(`## ${title}`);
    if (!items.length) {
      lines.push("- None detected");
      lines.push("");
      continue;
    }

    for (const item of items.slice(0, 60)) {
      lines.push(`- ${item.file}:${item.line} — ${item.snippet}`);
    }
    if (items.length > 60) {
      lines.push(`- ... ${items.length - 60} more`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function writeReports(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(REPORT_DIR, `${REPORT_BASENAME}-${stamp}.json`);
  const mdPath = path.join(REPORT_DIR, `${REPORT_BASENAME}-${stamp}.md`);
  const latestJsonPath = path.join(REPORT_DIR, `${REPORT_BASENAME}-latest.json`);
  const latestMdPath = path.join(REPORT_DIR, `${REPORT_BASENAME}-latest.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, `${toMarkdown(report)}\n`, "utf8");
  fs.writeFileSync(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(latestMdPath, `${toMarkdown(report)}\n`, "utf8");

  return {
    jsonPath,
    mdPath,
    latestJsonPath,
    latestMdPath
  };
}

function main() {
  const args = process.argv.slice(2);
  const strictMode = args.includes("--strict");
  const includeBuildOutput = args.includes("--include-build-output");

  const report = gatherForensics({ strictMode, includeBuildOutput });
  const paths = writeReports(report);
  const excludedRootsLabel = Array.isArray(report.excludedGeneratedRoots) && report.excludedGeneratedRoots.length > 0
    ? report.excludedGeneratedRoots.join(", ")
    : "none";

  console.log("[image-forensics] Sweep complete.");
  console.log(`[image-forensics] Mode: ${strictMode ? "strict" : "standard"}`);
  console.log(`[image-forensics] Generated deployment roots: ${includeBuildOutput ? "included" : `excluded by default (${excludedRootsLabel})`}`);
  console.log(`[image-forensics] Risk score: ${report.riskScore}/100`);
  console.log(`[image-forensics] Files scanned: ${report.summary.filesScanned}`);
  console.log(`[image-forensics] JSON: ${toPosix(path.relative(ROOT, paths.latestJsonPath))}`);
  console.log(`[image-forensics] Markdown: ${toPosix(path.relative(ROOT, paths.latestMdPath))}`);

  if (report.summary.suspiciousDefaults > 0 || report.summary.writeWithoutGuard > 0) {
    console.log("[image-forensics] Potential high-impact findings detected. Review report sections: Suspicious Defaults and Write Without Guard.");
  }
}

main();
