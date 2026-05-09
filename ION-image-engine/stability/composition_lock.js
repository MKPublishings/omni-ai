/**
 * Composition Lock
 * Enforces stable, predictable character positioning and framing.
 * Prevents characters from drifting too high, low, left, or right.
 * Maintains consistent head-and-shoulders framing for portraits.
 */

class CompositionLock {
  constructor(config = {}) {
    this.config = {
      // Frame constraints (normalized 0-1)
      safeZoneTop: config.safeZoneTop || 0.15,
      safeZoneBottom: config.safeZoneBottom || 0.85,
      safeZoneLeft: config.safeZoneLeft || 0.15,
      safeZoneRight: config.safeZoneRight || 0.85,
      
      // Portrait-specific settings
      headPositionY: config.headPositionY || 0.35, // Head should be ~1/3 from top
      headToFrameRatio: config.headToFrameRatio || 0.25, // Head ~25% of frame height
      
      // Aspect ratio handling
      targetAspectRatio: config.targetAspectRatio || 9 / 16, // Portrait 9:16
      aspectRatioTolerance: config.aspectRatioTolerance || 0.05,
      
      // Character centering
      centerHorizontal: config.centerHorizontal !== false,
      allowHorizontalShift: config.allowHorizontalShift || 0.1, // ±10% max shift
      
      enableStrictMode: config.enableStrictMode !== false,
      ...config
    };

    this.compositionHistory = [];
    this.driftDetections = [];
  }

  /**
   * Verify character is within safe composition zone
   */
  validateComposition(frameData) {
    const analysis = {
      isValid: true,
      violations: [],
      recommendations: [],
      originalPosition: { x: frameData.characterX, y: frameData.characterY }
    };

    const correctedFrame = { ...frameData };

    // Check horizontal centering
    if (this.config.centerHorizontal) {
      const horizontalCenter = frameData.characterX;
      const frameCenter = 0.5;
      const drift = Math.abs(horizontalCenter - frameCenter);

      if (drift > this.config.allowHorizontalShift) {
        analysis.violations.push({
          type: 'HORIZONTAL_DRIFT',
          drift: drift,
          threshold: this.config.allowHorizontalShift,
          severity: 'MEDIUM'
        });
        correctedFrame.characterX = frameCenter;
        analysis.recommendations.push('recenter_character_horizontally');
        analysis.isValid = false;
      }
    }

    // Check vertical positioning
    const verticalPosition = frameData.characterY;
    if (verticalPosition < this.config.safeZoneTop || verticalPosition > this.config.safeZoneBottom) {
      analysis.violations.push({
        type: 'VERTICAL_DRIFT',
        position: verticalPosition,
        safeZone: [this.config.safeZoneTop, this.config.safeZoneBottom],
        severity: 'HIGH'
      });
      correctedFrame.characterY = Math.max(
        this.config.safeZoneTop,
        Math.min(this.config.safeZoneBottom, verticalPosition)
      );
      analysis.recommendations.push('adjust_vertical_position');
      analysis.isValid = false;
    }

    // Validate head-and-shoulders framing
    if (frameData.headHeight && frameData.frameHeight) {
      const headRatio = frameData.headHeight / frameData.frameHeight;
      if (Math.abs(headRatio - this.config.headToFrameRatio) > 0.05) {
        analysis.violations.push({
          type: 'HEAD_FRAMING',
          detected: headRatio,
          expected: this.config.headToFrameRatio,
          severity: 'MEDIUM'
        });
        analysis.recommendations.push('adjust_camera_zoom');
        analysis.isValid = false;
      }
    }

    // Validate aspect ratio for portrait
    if (frameData.frameWidth && frameData.frameHeight) {
      const aspectRatio = frameData.frameWidth / frameData.frameHeight;
      const drift = Math.abs(aspectRatio - this.config.targetAspectRatio) / this.config.targetAspectRatio;
      
      if (drift > this.config.aspectRatioTolerance) {
        analysis.violations.push({
          type: 'ASPECT_RATIO_DRIFT',
          detected: aspectRatio,
          expected: this.config.targetAspectRatio,
          drift: drift,
          severity: 'HIGH'
        });
        analysis.recommendations.push('correct_aspect_ratio');
        analysis.isValid = false;
      }
    }

    analysis.correctedFrame = correctedFrame;
    this.compositionHistory.push(analysis);
    if (!analysis.isValid) {
      this.driftDetections.push(analysis);
    }

    return analysis;
  }

  /**
   * Generate composition-stabilizing prompt tags
   */
  generateCompositionTags() {
    return [
      'centered composition',
      'portrait framing',
      'head and shoulders visible',
      'balanced positioning',
      'stable character placement',
      'clear focal point',
      'consistent framing',
      'no off-center drift'
    ];
  }

  /**
   * Generate camera/zoom instructions for stable framing
   */
  generateCameraInstructions() {
    return {
      frameType: 'portrait',
      zoom: 'medium',
      focus: 'head and shoulders',
      distance: 'optimal for 9:16 format',
      verticalPosition: `${this.config.headPositionY * 100}% from top`,
      horizontalPosition: 'centered',
      notes: 'Prevent face slicing and crop by maintaining consistent distance'
    };
  }

  /**
   * Detect composition drift patterns
   */
  detectDriftPattern() {
    if (this.driftDetections.length < 3) {
      return { pattern: 'insufficient_data' };
    }

    const recentDrifts = this.driftDetections.slice(-5);
    const driftTypes = recentDrifts
      .flatMap(d => d.violations.map(v => v.type))
      .reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

    const pattern = Object.entries(driftTypes)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, frequency: count }));

    return {
      pattern: pattern,
      recommendation: this.getPatternRecommendation(pattern)
    };
  }

  getPatternRecommendation(pattern) {
    const primaryIssue = pattern[0]?.type;
    const recommendations = {
      HORIZONTAL_DRIFT: 'Enable stronger horizontal centering in render controller',
      VERTICAL_DRIFT: 'Increase vertical constraint strictness in frame data',
      HEAD_FRAMING: 'Adjust camera distance parameters in model config',
      ASPECT_RATIO_DRIFT: 'Apply aspect ratio normalization pre-render'
    };
    return recommendations[primaryIssue] || 'Review composition constraints';
  }

  reset() {
    this.compositionHistory = [];
    this.driftDetections = [];
  }
}

module.exports = CompositionLock;
