/**
 * Depth Scaler
 * Manages depth-of-field, lighting, and background coherence.
 * Prevents warped backgrounds, inconsistent lighting, and depth misalignment.
 */

class DepthScaler {
  constructor(config = {}) {
    this.config = {
      // Depth layers
      foregroundDepth: config.foregroundDepth || 0.8,
      characterDepth: config.characterDepth || 0.5,
      backgroundDepth: config.backgroundDepth || 0.1,
      
      // Lighting consistency
      lightingConsistency: config.lightingConsistency || 0.8, // 0-1, higher = more consistent
      mainLightAngle: config.mainLightAngle || 45, // degrees
      fillLightRatio: config.fillLightRatio || 0.3, // fill light as % of main
      
      // Focus/blur management
      depthOfFieldStrength: config.depthOfFieldStrength || 0.4,
      focusDistance: config.focusDistance || 0.5, // Character should be in focus
      blurFalloff: config.blurFalloff || 'quadratic',
      
      // Background coherence
      backgroundSimplicity: config.backgroundSimplicity || 0.7, // 0-1, higher = simpler
      backgroundVariance: config.backgroundVariance || 0.2, // Allowed variation
      
      enableStrictMode: config.enableStrictMode !== false,
      ...config
    };

    this.depthAnalysis = [];
    this.lightingIssues = [];
    this.backgroundProblems = [];
  }

  /**
   * Analyze and correct depth-related issues
   */
  analyzeDepthIssues(renderData) {
    const analysis = {
      isValid: true,
      issues: [],
      corrections: [],
      originalData: { ...renderData }
    };

    // Check depth separation
    if (renderData.characterDepth && renderData.backgroundDepth) {
      const depthSeparation = Math.abs(renderData.characterDepth - renderData.backgroundDepth);
      if (depthSeparation < 0.2) {
        analysis.issues.push({
          type: 'INSUFFICIENT_DEPTH_SEPARATION',
          detected: depthSeparation,
          minimum: 0.2,
          severity: 'HIGH',
          impact: 'Background will appear warped or merged with character'
        });
        analysis.corrections.push('increase_depth_separation');
        analysis.isValid = false;
      }
    }

    // Check lighting consistency
    if (renderData.lightingMap) {
      const consistency = this.measureLightingConsistency(renderData.lightingMap);
      if (consistency < this.config.lightingConsistency) {
        analysis.issues.push({
          type: 'LIGHTING_INCONSISTENCY',
          detected: consistency,
          expected: this.config.lightingConsistency,
          severity: 'HIGH',
          impact: 'Overexposure, harsh shadows, or spotty lighting'
        });
        analysis.corrections.push('normalize_lighting');
        analysis.isValid = false;
      }
    }

    // Check focus coherence
    if (renderData.focusPoint) {
      const focusDrift = Math.abs(renderData.focusPoint - this.config.focusDistance);
      if (focusDrift > 0.15) {
        analysis.issues.push({
          type: 'FOCUS_DRIFT',
          detected: renderData.focusPoint,
          expected: this.config.focusDistance,
          severity: 'MEDIUM',
          impact: 'Character may be blurry while background is sharp'
        });
        analysis.corrections.push('adjust_focus_distance');
        analysis.isValid = false;
      }
    }

    // Check background coherence
    if (renderData.backgroundVariance !== undefined) {
      if (renderData.backgroundVariance > this.config.backgroundVariance) {
        analysis.issues.push({
          type: 'BACKGROUND_INCOHERENCE',
          detected: renderData.backgroundVariance,
          max: this.config.backgroundVariance,
          severity: 'MEDIUM',
          impact: 'Chaotic, distorted, or misaligned background'
        });
        analysis.corrections.push('simplify_background');
        analysis.isValid = false;
      }
    }

    this.depthAnalysis.push(analysis);
    return analysis;
  }

  /**
   * Measure lighting consistency in render
   */
  measureLightingConsistency(lightingMap) {
    if (!lightingMap || typeof lightingMap !== 'object') return 0.5;

    const values = Object.values(lightingMap).filter(v => typeof v === 'number');
    if (values.length === 0) return 0.5;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Consistency metric: lower std dev = more consistent
    const consistency = Math.max(0, 1 - stdDev);
    return Math.min(1, consistency);
  }

  /**
   * Generate depth-stabilizing prompt tags
   */
  generateDepthTags() {
    return [
      'clear depth separation',
      'soft, consistent lighting',
      'well-lit background',
      'no harsh shadows',
      'balanced illumination',
      'coherent background',
      'stable depth field',
      'no depth distortion',
      'character in focus',
      'blurred background'
    ];
  }

  /**
   * Generate depth and lighting configuration
   */
  generateDepthConfiguration() {
    return {
      depthOfField: {
        enabled: true,
        strength: this.config.depthOfFieldStrength,
        focusDistance: this.config.focusDistance,
        blurFalloff: this.config.blurFalloff
      },
      lighting: {
        mainLight: {
          angle: this.config.mainLightAngle,
          intensity: 1.0,
          softness: 'medium'
        },
        fillLight: {
          intensity: this.config.fillLightRatio,
          softness: 'high'
        },
        consistency: this.config.lightingConsistency,
        avoidOverexposure: true
      },
      background: {
        simplicity: this.config.backgroundSimplicity,
        maxVariance: this.config.backgroundVariance,
        coherenceLevel: 'high',
        notes: 'Keep background simple and well-integrated'
      },
      depthLayers: {
        foreground: this.config.foregroundDepth,
        character: this.config.characterDepth,
        background: this.config.backgroundDepth,
        separation: 'maintain clear separation'
      }
    };
  }

  /**
   * Detect patterns in depth/lighting failures
   */
  detectDepthPatterns() {
    const patterns = {
      depthSeparation: 0,
      lightingIssues: 0,
      focusProblems: 0,
      backgroundIssues: 0
    };

    this.depthAnalysis.forEach(analysis => {
      analysis.issues.forEach(issue => {
        switch (issue.type) {
          case 'INSUFFICIENT_DEPTH_SEPARATION':
            patterns.depthSeparation++;
            break;
          case 'LIGHTING_INCONSISTENCY':
            patterns.lightingIssues++;
            break;
          case 'FOCUS_DRIFT':
            patterns.focusProblems++;
            break;
          case 'BACKGROUND_INCOHERENCE':
            patterns.backgroundIssues++;
            break;
        }
      });
    });

    return {
      patterns: patterns,
      primaryConcern: Object.entries(patterns).sort(([, a], [, b]) => b - a)[0][0],
      recommendation: this.getDepthRecommendation(patterns)
    };
  }

  getDepthRecommendation(patterns) {
    const maxPattern = Object.entries(patterns).sort(([, a], [, b]) => b - a)[0][0];
    const recommendations = {
      depthSeparation: 'Increase depth offset between character and background',
      lightingIssues: 'Apply softer, more distributed lighting; reduce shadows',
      focusProblems: 'Adjust focus distance to keep character sharp',
      backgroundIssues: 'Simplify background; reduce detail variance'
    };
    return recommendations[maxPattern] || 'Review depth configuration';
  }

  reset() {
    this.depthAnalysis = [];
    this.lightingIssues = [];
    this.backgroundProblems = [];
  }
}

module.exports = DepthScaler;
