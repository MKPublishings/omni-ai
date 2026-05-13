import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  ComplianceSummary,
  ComplianceViolation,
  HierarchyConfig,
  ModuleManifest,
  StaticAnalysisResult
} from "./types.js";

function buildSummary(violations: ComplianceViolation[]): ComplianceSummary {
  const criticalCount = violations.filter((violation) => violation.severity === "critical").length;
  const warningCount = violations.filter((violation) => violation.severity === "warning").length;
  return {
    checksRun: 1,
    criticalCount,
    warningCount,
    passed: criticalCount === 0
  };
}

export function validateManifestAgainstConfig(
  manifest: ModuleManifest,
  config: HierarchyConfig
): { violations: ComplianceViolation[]; summary: ComplianceSummary } {
  const violations: ComplianceViolation[] = [];
  const point = config.points.find((entry) => entry.id === manifest.pointId);

  if (!point) {
    violations.push({
      id: `${manifest.pointId}-point-missing`,
      severity: "critical",
      scope: manifest.slug,
      message: `Point ${manifest.pointId} is not declared in hierarchy.config.json`,
      remediation: "Add the point definition to the hierarchy configuration."
    });
  }

  if (point && point.slug !== manifest.slug) {
    violations.push({
      id: `${manifest.pointId}-slug-mismatch`,
      severity: "critical",
      scope: manifest.slug,
      message: `Manifest slug ${manifest.slug} does not match configured slug ${point.slug}`,
      remediation: "Align the module manifest slug with the hierarchy configuration."
    });
  }

  if (point) {
    const featureIds = manifest.features.map((feature) => feature.id);
    const missingFeatures = point.features.filter((feature) => !featureIds.includes(feature));
    const unauthorizedFeatures = featureIds.filter((feature) => !point.features.includes(feature));

    for (const feature of missingFeatures) {
      violations.push({
        id: `${manifest.pointId}-${feature}-missing`,
        severity: "critical",
        scope: manifest.slug,
        message: `Feature ${feature} is declared constitutionally but missing from the manifest.`,
        remediation: "Implement the missing feature handler."
      });
    }

    for (const feature of unauthorizedFeatures) {
      violations.push({
        id: `${manifest.pointId}-${feature}-unauthorized`,
        severity: "critical",
        scope: manifest.slug,
        message: `Feature ${feature} is not declared in the hierarchy configuration.`,
        remediation: "Remove the feature or declare it in the hierarchy configuration."
      });
    }
  }

  if (manifest.constitutionalBasis.length === 0) {
    violations.push({
      id: `${manifest.pointId}-constitutional-basis`,
      severity: "critical",
      scope: manifest.slug,
      message: "Manifest is missing constitutional traceability.",
      remediation: "Populate constitutionalBasis with constitution clauses."
    });
  }

  return {
    violations,
    summary: buildSummary(violations)
  };
}

export function scanForCrossPointImports(rootDir: string): StaticAnalysisResult {
  const findings: StaticAnalysisResult["findings"] = [];
  const pointImportPattern = /from\s+["']\.\.\/(P[1-8]-[a-z-]+)\//i;

  function walk(directory: string): void {
    for (const entry of readdirSync(directory)) {
      const fullPath = join(directory, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!fullPath.endsWith(".ts")) {
        continue;
      }

      const normalizedPath = relative(rootDir, fullPath).replace(/\\/g, "/");
      if (normalizedPath.startsWith("bootstrap/")) {
        continue;
      }

      const content = readFileSync(fullPath, "utf8");
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (pointImportPattern.test(line)) {
          findings.push({
            filePath: normalizedPath,
            line: index + 1,
            message: "Direct cross-point import detected. Use the cross-point bus instead."
          });
        }
      });
    }
  }

  walk(rootDir);
  return { findings };
}