/**
 * Proportional Enforcer
 * Ensures character anatomy maintains stable, realistic proportions throughout generation.
 * Prevents stretching, elongation, and distorted limb lengths.
 */

class ProportionalEnforcer {
  constructor(config = {}) {
    this.config = {
      headToBodyRatio: config.headToBodyRatio || 1 / 7.5, // Realistic human ratio
      shoulderWidth: config.shoulderWidth || 0.25, // Normalized to body height
      limbLength: config.limbLength || 0.43, // Arms and legs proportional
      faceHeightRatio: config.faceHeightRatio || 0.12, // Face as % of body
      torsoRatio: config.torsoRatio || 0.28, // Torso length ratio
      enableStrictMode: config.enableStrictMode !== false,
      toleranceMargin: config.toleranceMargin || 0.05, // 5% tolerance
      ...config
    };

    this.violations = [];
    this.correctionLog = [];
  }

  /**
   * Analyze character dimensions and enforce proportions
   */
  enforceProportions(characterDimensions) {
    const analysis = {
      isValid: true,
      violations: [],
      corrections: [],
      originalDimensions: { ...characterDimensions }
    };

    const corrected = { ...characterDimensions };

    // Validate head-to-body ratio
    const headBodyRatio = characterDimensions.headHeight / characterDimensions.bodyHeight;
    if (Math.abs(headBodyRatio - this.config.headToBodyRatio) > this.config.toleranceMargin) {
      analysis.violations.push({
        type: 'HEAD_BODY_RATIO',
        detected: headBodyRatio,
        expected: this.config.headToBodyRatio,
        severity: 'HIGH'
      });
      corrected.headHeight = characterDimensions.bodyHeight * this.config.headToBodyRatio;
      analysis.corrections.push('head_to_body_ratio_adjusted');
      analysis.isValid = false;
    }

    // Validate shoulder width
    const shoulderRatio = characterDimensions.shoulderWidth / characterDimensions.bodyHeight;
    if (Math.abs(shoulderRatio - this.config.shoulderWidth) > this.config.toleranceMargin) {
      analysis.violations.push({
        type: 'SHOULDER_WIDTH',
        detected: shoulderRatio,
        expected: this.config.shoulderWidth,
        severity: 'MEDIUM'
      });
      corrected.shoulderWidth = characterDimensions.bodyHeight * this.config.shoulderWidth;
      analysis.corrections.push('shoulder_width_adjusted');
      analysis.isValid = false;
    }

    // Validate arm length
    if (characterDimensions.armLength) {
      const armRatio = characterDimensions.armLength / characterDimensions.bodyHeight;
      if (Math.abs(armRatio - this.config.limbLength) > this.config.toleranceMargin) {
        analysis.violations.push({
          type: 'ARM_LENGTH',
          detected: armRatio,
          expected: this.config.limbLength,
          severity: 'MEDIUM'
        });
        corrected.armLength = characterDimensions.bodyHeight * this.config.limbLength;
        analysis.corrections.push('arm_length_adjusted');
        analysis.isValid = false;
      }
    }

    // Validate leg length
    if (characterDimensions.legLength) {
      const legRatio = characterDimensions.legLength / characterDimensions.bodyHeight;
      if (Math.abs(legRatio - this.config.limbLength) > this.config.toleranceMargin) {
        analysis.violations.push({
          type: 'LEG_LENGTH',
          detected: legRatio,
          expected: this.config.limbLength,
          severity: 'MEDIUM'
        });
        corrected.legLength = characterDimensions.bodyHeight * this.config.limbLength;
        analysis.corrections.push('leg_length_adjusted');
        analysis.isValid = false;
      }
    }

    // Validate face height
    if (characterDimensions.faceHeight) {
      const faceRatio = characterDimensions.faceHeight / characterDimensions.bodyHeight;
      if (Math.abs(faceRatio - this.config.faceHeightRatio) > this.config.toleranceMargin) {
        analysis.violations.push({
          type: 'FACE_HEIGHT',
          detected: faceRatio,
          expected: this.config.faceHeightRatio,
          severity: 'HIGH'
        });
        corrected.faceHeight = characterDimensions.bodyHeight * this.config.faceHeightRatio;
        analysis.corrections.push('face_height_adjusted');
        analysis.isValid = false;
      }
    }

    analysis.correctedDimensions = corrected;
    this.violations.push(...analysis.violations);
    this.correctionLog.push(analysis);

    return analysis;
  }

  /**
   * Generate anti-stretching prompts
   */
  generateAntiStretchingTags() {
    return [
      'realistic proportions',
      'natural anatomy',
      'no stretched limbs',
      'no elongated torso',
      'no distorted features',
      'anatomically correct',
      'balanced proportions',
      'consistent dimensions'
    ];
  }

  /**
   * Get severity-weighted violations
   */
  getViolationReport() {
    const report = {
      totalViolations: this.violations.length,
      highSeverity: this.violations.filter(v => v.severity === 'HIGH'),
      mediumSeverity: this.violations.filter(v => v.severity === 'MEDIUM'),
      correctionAttempts: this.correctionLog.length,
      successRate: this.correctionLog.filter(c => c.isValid).length / Math.max(this.correctionLog.length, 1)
    };
    return report;
  }

  reset() {
    this.violations = [];
    this.correctionLog = [];
  }
}

module.exports = ProportionalEnforcer;
