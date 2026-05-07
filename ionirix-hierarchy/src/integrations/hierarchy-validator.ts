import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AuditMetrics,
  AuditSection,
  ComplianceReport,
  ComplianceViolation,
  HierarchyConfig,
  ModuleManifest,
  ValidationResult
} from "../core/types.js";
import { scanForCrossPointImports, validateManifestAgainstConfig } from "../core/validation.js";

export class HierarchyValidator {
  constructor(
    private readonly config: HierarchyConfig,
    private readonly manifests: ModuleManifest[],
    private readonly workspaceRoot: string
  ) {}

  validateAll(): ValidationResult {
    const violations: ComplianceViolation[] = [];
    for (const manifest of this.manifests) {
      violations.push(...validateManifestAgainstConfig(manifest, this.config).violations);
    }

    const requiredFiles = ["CONSTITUTION.md", "hierarchy.config.json", "package.json", "tsconfig.json"];
    for (const requiredFile of requiredFiles) {
      if (!existsSync(join(this.workspaceRoot, requiredFile))) {
        violations.push({
          id: `missing-${requiredFile}`,
          severity: "critical",
          scope: "workspace-root",
          message: `Required file missing: ${requiredFile}`,
          remediation: "Restore the missing constitutional workspace file."
        });
      }
    }

    const crossPointFindings = scanForCrossPointImports(join(this.workspaceRoot, "src"));
    for (const finding of crossPointFindings.findings) {
      violations.push({
        id: `cross-point-${finding.filePath}-${finding.line}`,
        severity: "critical",
        scope: finding.filePath,
        message: finding.message,
        remediation: "Route cross-point interactions through src/integrations/cross-point-bus.ts."
      });
    }

    const criticalCount = violations.filter((violation) => violation.severity === "critical").length;
    const warningCount = violations.filter((violation) => violation.severity === "warning").length;
    return {
      violations,
      summary: {
        checksRun: 6,
        criticalCount,
        warningCount,
        passed: criticalCount === 0
      }
    };
  }

  buildAuditReport(): ComplianceReport {
    const validation = this.validateAll();
    const metrics = this.collectMetrics();
    const constitution = readFileSync(join(this.workspaceRoot, this.config.constitution), "utf8");
    const sections: AuditSection[] = [
      {
        title: "Constitution",
        status: constitution.includes("Structural Law") ? "pass" : "fail",
        detail: `${constitution.split(/\r?\n/).length} constitutional lines loaded.`
      },
      {
        title: "Hierarchy Config",
        status: this.config.points.length === 8 && this.config.eventTypes.length === 28 ? "pass" : "fail",
        detail: `${this.config.points.length} points, ${this.config.eventTypes.length} event types.`
      },
      {
        title: "Modules",
        status: this.manifests.length === 8 ? "pass" : "fail",
        detail: `${metrics.moduleCount} modules and ${metrics.featureCount} feature handlers registered.`
      },
      {
        title: "Metrics",
        status: metrics.subscriptionCount >= 32 ? "pass" : "warn",
        detail: `${metrics.eventCount} authorized events and ${metrics.subscriptionCount} subscriptions tracked.`
      },
      {
        title: "Event Bus Topology",
        status: validation.summary.passed ? "pass" : "fail",
        detail: validation.summary.passed
          ? "All registered points comply with authorized emitter/subscriber topology."
          : `${validation.summary.criticalCount} critical violations detected.`
      }
    ];

    return {
      generatedAt: new Date().toISOString(),
      summary: validation.summary,
      sections,
      violations: validation.violations
    };
  }

  formatAuditReport(): string {
    const report = this.buildAuditReport();
    const sectionLines = report.sections
      .map((section) => `- [${section.status.toUpperCase()}] ${section.title}: ${section.detail}`)
      .join("\n");
    const violationLines =
      report.violations.length === 0
        ? "- none"
        : report.violations
            .map((violation) => `- [${violation.severity.toUpperCase()}] ${violation.scope}: ${violation.message}`)
            .join("\n");

    return [
      `Ionirix Hierarchy Audit @ ${report.generatedAt}`,
      "",
      sectionLines,
      "",
      "Violations",
      violationLines
    ].join("\n");
  }

  private collectMetrics(): AuditMetrics {
    const featureCount = this.manifests.reduce((total, manifest) => total + manifest.features.length, 0);
    const subscriptionCount = this.manifests.reduce(
      (total, manifest) => total + manifest.allowedSubscriptions.length,
      0
    );

    return {
      moduleCount: this.manifests.length,
      featureCount,
      eventCount: this.config.eventTypes.length,
      subscriptionCount
    };
  }
}