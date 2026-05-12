/**
 * Proportional Enforcer
 * Ensures character anatomy maintains stable, realistic proportions throughout generation.
 * Prevents stretching, elongation, and distorted limb lengths.
 * 
 * Supports stylized anime mode for non-realistic proportions (large eyes, etc.)
 */

class ProportionalEnforcer {
  constructor(config = {}) {
    // Detect anime/stylized mode
    const isStylized = config.stylizedMode === true || config.animeMode === true;
    
    this.config = {
      // Mode flags
      animeMode: isStylized || config.animeMode === true,
      stylizedMode: isStylized || config.stylizedMode === true,
      enableStrictMode: !isStylized && config.enableStrictMode !== false,
      
      // Realistic proportions (standard mode)
      headToBodyRatio: config.headToBodyRatio || 1 / 7.5, // Realistic human ratio
      shoulderWidth: config.shoulderWidth || 0.25, // Normalized to body height
      limbLength: config.limbLength || 0.43, // Arms and legs proportional
      faceHeightRatio: config.faceHeightRatio || 0.12, // Face as % of body
      torsoRatio: config.torsoRatio || 0.28, // Torso length ratio
      toleranceMargin: !isStylized ? 0.025 : 0.10, // 2.5% strict, 10% stylized (tighter for faces)
      
      // Anime-specific proportions (stylized mode)
      animeEyeSize: config.animeEyeSize || 0.15, // Larger eyes in anime
      animeHeadRatio: config.animeHeadRatio || 1 / 6, // Slightly larger head in anime
      animeToleranceMargin: config.animeToleranceMargin || 0.20, // More lenient for anime
      
      ...config
    };

    this.violations = [];
    this.correctionLog = [];
  }

  /**
   * Analyze character dimensions and enforce proportions
   * In anime mode, allows for stylized proportions (large eyes, etc.)
   */
  enforceProportions(characterDimensions) {
    const analysis = {
      isValid: true,
      violations: [],
      corrections: [],
      originalDimensions: { ...characterDimensions },
      mode: this.config.animeMode ? 'anime' : 'standard'
    };

    // In anime mode, skip strict proportion enforcement
    if (this.config.animeMode) {
      return analysis; // Anime allows for stylized proportions
    }

    const corrected = { ...characterDimensions };
    const tolerance = this.config.animeMode ? this.config.animeToleranceMargin : this.config.toleranceMargin;

    // Validate head-to-body ratio
    const headBodyRatio = characterDimensions.headHeight / characterDimensions.bodyHeight;
    const expectedHeadRatio = this.config.animeMode ? this.config.animeHeadRatio : this.config.headToBodyRatio;
    
    if (Math.abs(headBodyRatio - expectedHeadRatio) > tolerance) {
      analysis.violations.push({
        type: 'HEAD_BODY_RATIO',
        detected: headBodyRatio,
        expected: expectedHeadRatio,
        severity: 'HIGH'
      });
      corrected.headHeight = characterDimensions.bodyHeight * expectedHeadRatio;
      analysis.corrections.push('head_to_body_ratio_adjusted');
      analysis.isValid = false;
    }

    // Validate shoulder width (relaxed in anime mode)
    const shoulderRatio = characterDimensions.shoulderWidth / characterDimensions.bodyHeight;
    if (Math.abs(shoulderRatio - this.config.shoulderWidth) > tolerance) {
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

    // Validate arm length (relaxed in anime mode)
    if (characterDimensions.armLength) {
      const armRatio = characterDimensions.armLength / characterDimensions.bodyHeight;
      if (Math.abs(armRatio - this.config.limbLength) > tolerance) {
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

    // Validate leg length (relaxed in anime mode)
    if (characterDimensions.legLength) {
      const legRatio = characterDimensions.legLength / characterDimensions.bodyHeight;
      if (Math.abs(legRatio - this.config.limbLength) > tolerance) {
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

    // Validate face height (allow larger eyes in anime mode)
    if (characterDimensions.faceHeight) {
      const faceRatio = characterDimensions.faceHeight / characterDimensions.bodyHeight;
      const expectedFaceRatio = this.config.animeMode ? this.config.animeEyeSize : this.config.faceHeightRatio;
      if (Math.abs(faceRatio - expectedFaceRatio) > tolerance) {
        analysis.violations.push({
          type: 'FACE_HEIGHT',
          detected: faceRatio,
          expected: expectedFaceRatio,
          severity: 'HIGH'
        });
        corrected.faceHeight = characterDimensions.bodyHeight * expectedFaceRatio;
        analysis.corrections.push('face_height_adjusted');
        analysis.isValid = false;
      }
    } else {
      // If face is expected but missing, treat as violation
      analysis.violations.push({
        type: 'FACE_HEIGHT_MISSING',
        detected: null,
        expected: this.config.faceHeightRatio,
        severity: 'CRITICAL',
        message: 'Face height missing from character dimensions.'
      });
      analysis.isValid = false;
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
    if (this.config.animeMode) {
      return this.generateAnimeProportionTags();
    }
    
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
   * Generate anime-specific proportion tags
   * Allows for stylized large eyes, smaller noses, exaggerated expressions
   */
  generateAnimeProportionTags() {
    return [
      'stylized proportions',
      'anime anatomy',
      'expressive features',
      'stylized eyes',
      'anime-appropriate proportions',
      'consistent stylization',
      'no realistic features mixing',
      'cohesive character design'
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
