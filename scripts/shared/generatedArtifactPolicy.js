const path = require("node:path");

const GENERATED_DEPLOYMENT_PREFIXES = [
  "public/",
  "apps/dashboard/out/"
];

function toPosix(value) {
  return String(value || "").replace(/\\/g, "/");
}

function normalizeRelativePath(rootDir, inputPath) {
  return toPosix(path.isAbsolute(inputPath) ? path.relative(rootDir, inputPath) : inputPath);
}

function isGeneratedDeploymentArtifactPath(rootDir, inputPath, options = {}) {
  if (options.includeBuildOutput === true) {
    return false;
  }

  const relPath = normalizeRelativePath(rootDir, inputPath);
  return GENERATED_DEPLOYMENT_PREFIXES.some((prefix) => relPath === prefix.slice(0, -1) || relPath.startsWith(prefix));
}

function filterGeneratedDeploymentArtifacts(rootDir, inputPaths, options = {}) {
  return inputPaths.filter((inputPath) => !isGeneratedDeploymentArtifactPath(rootDir, inputPath, options));
}

function resolveExistingGeneratedDeploymentRoots(rootDir) {
  return GENERATED_DEPLOYMENT_PREFIXES.filter((prefix) => {
    const targetPath = path.join(rootDir, prefix);
    return require("node:fs").existsSync(targetPath);
  });
}

module.exports = {
  GENERATED_DEPLOYMENT_PREFIXES,
  filterGeneratedDeploymentArtifacts,
  isGeneratedDeploymentArtifactPath,
  normalizeRelativePath,
  resolveExistingGeneratedDeploymentRoots,
  toPosix
};