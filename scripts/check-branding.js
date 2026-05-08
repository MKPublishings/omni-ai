const fs = require("fs");
const path = require("path");
const {
  filterGeneratedDeploymentArtifacts,
  resolveExistingGeneratedDeploymentRoots,
  toPosix
} = require("./shared/generatedArtifactPolicy");

const rootDir = process.cwd();

// Branding policy:
// - Authored source files are hard-gated to the canonical product casing: "ION Ai".
// - Generated deployment artifacts are excluded separately via generatedArtifactPolicy.
// - Future exceptions should be rare and justified as truly external/generated surfaces,
//   not as a workaround for authored repo content drift.

const allowedExtensions = new Set([
  ".js",
  ".ts",
  ".md",
  ".json",
  ".html",
  ".css",
  ".txt",
  ".toml",
  ".yml",
  ".yaml",
  ".d.ts"
]);

const ignoredDirs = new Set([
  "node_modules",
  ".git",
  ".wrangler",
  ".vscode",
  "ION_image_exports"
]);

const disallowedPatterns = [
  /\bION\s+Mind\/OS\b/g,
  /\bMind\/OS\b/g,
  /\bION\s+MIND\/OS\b/g,
  /\bION\s+Mind\b/g,
  /\bION\s+AI\b/g,
  /\bION\s+AI\b/g
];

function walk(dirPath, files = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }

    const ext = path.extname(entry.name);
    if (allowedExtensions.has(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

function findViolations(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const violations = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of disallowedPatterns) {
      if (pattern.test(line)) {
        violations.push({
          filePath,
          lineNumber: index + 1,
          line: line.trim()
        });
      }
      pattern.lastIndex = 0;
    }
  }

  return violations;
}

const files = filterGeneratedDeploymentArtifacts(rootDir, walk(rootDir));
const violations = files.flatMap(findViolations);
const excludedGeneratedRoots = resolveExistingGeneratedDeploymentRoots(rootDir);

if (violations.length > 0) {
  console.error("\nBranding consistency check failed. Use 'ION Ai' brand casing.\n");
  for (const violation of violations.slice(0, 80)) {
    const rel = path.relative(rootDir, violation.filePath).replace(/\\/g, "/");
    console.error(`- ${rel}:${violation.lineNumber}  ${violation.line}`);
  }

  if (violations.length > 80) {
    console.error(`...and ${violations.length - 80} more`);
  }

  console.error("\nPolicy: authored sources remain hard-gated; only generated deployment output is excluded by default.\n");

  process.exit(1);
}

if (excludedGeneratedRoots.length > 0) {
  console.log(`Branding consistency check excluded generated paths by default: ${excludedGeneratedRoots.join(", ")}`);
}
console.log("Branding consistency check passed.");
