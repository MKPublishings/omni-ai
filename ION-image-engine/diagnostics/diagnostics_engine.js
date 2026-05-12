/**
 * Diagnostics Engine
 * Automatically detects and reports Ion's rendering failures before final output.
 * Identifies stretching, slicing, duplication, overexposure, and depth errors.
 */

class DiagnosticsEngine {
  constructor(config = {}) {
    this.config = {
      enableAutoCorrect: config.enableAutoCorrect !== false,
      severity: config.severity || 'all', // all, high, critical
      thresholds: {
        stretchingRatio: config.stretchingRatio || 1.3,
        slicingEdgeDistance: config.slicingEdgeDistance || 0.05, // 5% from edge
        duplicationThreshold: config.duplicationThreshold || 0.7,
        overexposureThreshold: config.overexposureThreshold || 0.95,
        depthDistortionThreshold: config.depthDistortionThreshold || 0.2
      },
      ...config
    };

    this.reportLog = [];
    this.detectionPatterns = {};
  }

  /**
   * Run full diagnostic suite on render output
   */
  diagnose(renderOutput) {
    const report = {
      timestamp: new Date().toISOString(),
      overall: 'PASS',
      detections: [],
      recommendations: [],
      correctionsSuggested: []
    };

    // Run each detection
    const stretching = this.detectStretching(renderOutput);
    const slicing = this.detectSlicing(renderOutput);
    const duplication = this.detectDuplication(renderOutput);
    const overexposure = this.detectOverexposure(renderOutput);
    const depthErrors = this.detectDepthErrors(renderOutput);
    const proportions = this.detectProportionErrors(renderOutput);

    // Aggregate results
    [stretching, slicing, duplication, overexposure, depthErrors, proportions].forEach(detection => {
      if (detection.detected) {
        report.detections.push(detection);
        report.overall = this.upgradeOverallStatus(report.overall, detection.severity);
      }
    });

    // Generate recommendations
    if (report.detections.length > 0) {
      report.recommendations = this.generateRecommendations(report.detections);
      report.correctionsSuggested = this.suggestCorrections(report.detections);
    }

    this.reportLog.push(report);
    return report;
  }

  /**
   * Detect anatomical stretching
   */
  detectStretching(renderOutput) {
    const detection = {
      type: 'ANATOMICAL_STRETCHING',
      detected: false,
      severity: null,
      details: [],
      indicators: []
    };

    if (!renderOutput.proportions) {
      return detection;
    }

    const { proportions } = renderOutput;

    // Check for elongated torso
    if (proportions.torsoHeight && proportions.headHeight) {
      const torsoHeadRatio = proportions.torsoHeight / proportions.headHeight;
      if (torsoHeadRatio > this.config.thresholds.stretchingRatio) {
        detection.detected = true;
        detection.severity = 'HIGH';
        detection.indicators.push('ELONGATED_TORSO');
        detection.details.push({
          issue: 'Torso stretched vertically',
          ratio: torsoHeadRatio,
          threshold: this.config.thresholds.stretchingRatio
        });
      }
    }

    // Check for stretched limbs
    if (proportions.armLength && proportions.bodyHeight) {
      const armRatio = proportions.armLength / proportions.bodyHeight;
      if (armRatio > 0.5) { // Arms should be ~43% of body
        detection.detected = true;
        detection.severity = 'HIGH';
        detection.indicators.push('STRETCHED_ARMS');
        detection.details.push({
          issue: 'Arms stretched beyond natural proportions',
          ratio: armRatio,
          expected: 0.43
        });
      }
    }

    if (proportions.legLength && proportions.bodyHeight) {
      const legRatio = proportions.legLength / proportions.bodyHeight;
      if (legRatio > 0.5) {
        detection.detected = true;
        detection.severity = 'HIGH';
        detection.indicators.push('STRETCHED_LEGS');
        detection.details.push({
          issue: 'Legs stretched beyond natural proportions',
          ratio: legRatio,
          expected: 0.43
        });
      }
    }

    return detection;
  }

  /**
   * Detect face/feature slicing
   */
  detectSlicing(renderOutput) {
    const detection = {
      type: 'FEATURE_SLICING',
      detected: false,
      severity: null,
      details: [],
      indicators: []
    };

    if (!renderOutput.boundingBox) {
      detection.detected = true;
      detection.severity = 'CRITICAL';
      detection.indicators.push('FACE_BOUNDING_BOX_MISSING');
      detection.details.push({
        issue: 'Face bounding box missing from render output',
        message: 'Cannot verify face integrity without bounding box.'
      });
      return detection;
    }

    const { boundingBox } = renderOutput;

    // Check if head is cut at frame edges
    if (boundingBox.faceTop < this.config.thresholds.slicingEdgeDistance) {
      detection.detected = true;
      detection.severity = 'CRITICAL';
      detection.indicators.push('FOREHEAD_CROPPED');
      detection.details.push({
        issue: 'Forehead cut off at frame top',
        distance: boundingBox.faceTop,
        threshold: this.config.thresholds.slicingEdgeDistance
      });
    }

    if (boundingBox.faceBottom > (1 - this.config.thresholds.slicingEdgeDistance)) {
      detection.detected = true;
      detection.severity = 'CRITICAL';
      detection.indicators.push('CHIN_CROPPED');
      detection.details.push({
        issue: 'Chin cut off at frame bottom',
        distance: 1 - boundingBox.faceBottom,
        threshold: this.config.thresholds.slicingEdgeDistance
      });
    }

    // Check for partial feature visibility
    if (boundingBox.eyeDistance) {
      const eyesCovered = boundingBox.eyeDistance < 0.05;
      if (eyesCovered) {
        detection.detected = true;
        detection.severity = 'HIGH';
        detection.indicators.push('EYES_PARTIALLY_HIDDEN');
      }
    }

    return detection;
  }

  /**
   * Detect duplicate or duplicated features
   */
  detectDuplication(renderOutput) {
    const detection = {
      type: 'FEATURE_DUPLICATION',
      detected: false,
      severity: null,
      details: [],
      indicators: []
    };

    if (!renderOutput.featureMap) {
      return detection;
    }

    const featuresByType = {};
    renderOutput.featureMap.forEach(feature => {
      featuresByType[feature.type] = (featuresByType[feature.type] || 0) + 1;
    });

    // Check for duplicate eyes, noses, mouths, etc.
    ['eyes', 'nose', 'mouth'].forEach(feature => {
      const count = featuresByType[feature] || 0;
      const expected = feature === 'eyes' ? 2 : 1;

      if (count > expected * 1.5) {
        detection.detected = true;
        detection.severity = 'CRITICAL';
        detection.indicators.push(`DUPLICATE_${feature.toUpperCase()}`);
        detection.details.push({
          issue: `Duplicated or triplicated ${feature}`,
          detected: count,
          expected: expected
        });
      }
    });

    return detection;
  }

  /**
   * Detect overexposure and harsh lighting
   */
  detectOverexposure(renderOutput) {
    const detection = {
      type: 'OVEREXPOSURE',
      detected: false,
      severity: null,
      details: [],
      indicators: []
    };

    if (!renderOutput.lighting) {
      return detection;
    }

    const { lighting } = renderOutput;

    if (lighting.averageBrightness > this.config.thresholds.overexposureThreshold) {
      detection.detected = true;
      detection.severity = 'MEDIUM';
      detection.indicators.push('HIGH_OVERALL_BRIGHTNESS');
      detection.details.push({
        issue: 'Image is overexposed',
        brightness: lighting.averageBrightness,
        threshold: this.config.thresholds.overexposureThreshold
      });
    }

    if (lighting.harshShadowRatio > 0.3) {
      detection.detected = true;
      detection.severity = 'MEDIUM';
      detection.indicators.push('HARSH_SHADOWS');
      detection.details.push({
        issue: 'Harsh, high-contrast shadows',
        ratio: lighting.harshShadowRatio
      });
    }

    if (lighting.inconsistency > 0.4) {
      detection.detected = true;
      detection.severity = 'HIGH';
      detection.indicators.push('LIGHTING_INCONSISTENCY');
      detection.details.push({
        issue: 'Lighting is spotty or inconsistent',
        inconsistency: lighting.inconsistency
      });
    }

    return detection;
  }

  /**
   * Detect depth and warping issues
   */
  detectDepthErrors(renderOutput) {
    const detection = {
      type: 'DEPTH_DISTORTION',
      detected: false,
      severity: null,
      details: [],
      indicators: []
    };

    if (!renderOutput.depthMap) {
      return detection;
    }

    const { depthMap } = renderOutput;

    if (depthMap.depthSeparation < 0.2) {
      detection.detected = true;
      detection.severity = 'MEDIUM';
      detection.indicators.push('INSUFFICIENT_DEPTH');
      detection.details.push({
        issue: 'Background too close to character',
        separation: depthMap.depthSeparation,
        minimum: 0.2
      });
    }

    if (depthMap.warping > this.config.thresholds.depthDistortionThreshold) {
      detection.detected = true;
      detection.severity = 'HIGH';
      detection.indicators.push('WARPED_BACKGROUND');
      detection.details.push({
        issue: 'Background shows signs of warping',
        warping: depthMap.warping
      });
    }

    return detection;
  }

  /**
   * Detect proportion violations
   */
  detectProportionErrors(renderOutput) {
    const detection = {
      type: 'PROPORTION_ERROR',
      detected: false,
      severity: null,
      details: [],
      indicators: []
    };

    if (!renderOutput.proportions) {
      return detection;
    }

    const { proportions } = renderOutput;

    // Head-to-body ratio should be ~1:7.5
    if (proportions.headHeight && proportions.bodyHeight) {
      const ratio = proportions.headHeight / proportions.bodyHeight;
      if (ratio > 0.15 || ratio < 0.10) {
        detection.detected = true;
        detection.severity = 'MEDIUM';
        detection.indicators.push('ABNORMAL_HEAD_SIZE');
        detection.details.push({
          issue: 'Head size disproportionate to body',
          ratio: ratio,
          expected: 1 / 7.5
        });
      }
    }

    return detection;
  }

  /**
   * Upgrade overall status based on detections
   */
  upgradeOverallStatus(current, newSeverity) {
    const levels = { PASS: 0, INFO: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    return Object.entries(levels).find(([, val]) => val === Math.max(levels[current], levels[newSeverity]))[0];
  }

  /**
   * Generate recommendations for detected issues
   */
  generateRecommendations(detections) {
    const recommendations = [];
    const recommendations_map = {
      ANATOMICAL_STRETCHING: 'Enable proportional enforcer with strict mode',
      FEATURE_SLICING: 'Reduce face-focus weight and increase zoom-out',
      FEATURE_DUPLICATION: 'Review prompt clarity and enable layer isolation',
      OVEREXPOSURE: 'Reduce lighting intensity and add fill light balance',
      DEPTH_DISTORTION: 'Increase depth separation and simplify background',
      PROPORTION_ERROR: 'Enforce head-to-body ratio in generation config'
    };

    detections.forEach(detection => {
      if (recommendations_map[detection.type]) {
        recommendations.push({
          detection: detection.type,
          action: recommendations_map[detection.type],
          priority: detection.severity
        });
      }
    });

    return recommendations;
  }

  /**
   * Suggest specific corrections
   */
  suggestCorrections(detections) {
    const corrections = [];
    
    detections.forEach(detection => {
      detection.indicators.forEach(indicator => {
        const correctionMap = {
          ELONGATED_TORSO: 'proportionalEnforcer.torsoRatio = 0.28',
          STRETCHED_ARMS: 'proportionalEnforcer.limbLength = 0.43',
          STRETCHED_LEGS: 'proportionalEnforcer.limbLength = 0.43',
          FOREHEAD_CROPPED: 'compositionLock.headPositionY = 0.4',
          CHIN_CROPPED: 'compositionLock.headPositionY = 0.3',
          DUPLICATE_EYES: 'Enable feature isolation in render config',
          HIGH_OVERALL_BRIGHTNESS: 'lighting.mainLight.intensity = 0.8',
          HARSH_SHADOWS: 'lighting.fillLight.intensity = 0.5',
          INSUFFICIENT_DEPTH: 'depthScaler.depthSeparation = 0.4'
        };

        if (correctionMap[indicator]) {
          corrections.push({
            issue: indicator,
            correction: correctionMap[indicator]
          });
        }
      });
    });

    return corrections;
  }

  /**
   * Get diagnostic summary
   */
  getSummary() {
    return {
      totalReports: this.reportLog.length,
      passRate: this.reportLog.filter(r => r.overall === 'PASS').length / Math.max(this.reportLog.length, 1),
      commonIssues: this.getCommonIssues(),
      lastReport: this.reportLog[this.reportLog.length - 1] || null
    };
  }

  /**
   * Get most common issues
   */
  getCommonIssues() {
    const issueCount = {};
    
    this.reportLog.forEach(report => {
      report.detections.forEach(detection => {
        issueCount[detection.type] = (issueCount[detection.type] || 0) + 1;
      });
    });

    return Object.entries(issueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, frequency: count }));
  }

  reset() {
    this.reportLog = [];
    this.detectionPatterns = {};
  }
}

module.exports = DiagnosticsEngine;
