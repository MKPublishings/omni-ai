/**
 * Ion Render Controller
 * Phase 3 - Orchestrates prompt building, stability enforcement, and generation workflow
 * Merges prompts, tags, configs, and stability rules into coherent generation pipeline
 */

const ProportionalEnforcer = require('../stability/proportional_enforcer');
const CompositionLock = require('../stability/composition_lock');
const DepthScaler = require('../stability/depth_scaler');
const DiagnosticsEngine = require('../diagnostics/diagnostics_engine');

const fs = require('fs');
const path = require('path');

class IonRenderController {
  constructor(config = {}) {
    this.config = {
      basePromptsPath: config.basePromptsPath || path.join(__dirname, '../prompts/base_prompts.json'),
      negativeTagsPath: config.negativeTagsPath || path.join(__dirname, '../prompts/negative_tags.json'),
      compositionPath: config.compositionPath || path.join(__dirname, '../prompts/composition_templates.json'),
      renderSettingsPath: config.renderSettingsPath || path.join(__dirname, '../../config/render_settings.yaml'),
      modelConfigPath: config.modelConfigPath || path.join(__dirname, '../../config/model_config.yaml'),
      logsPath: config.logsPath || path.join(__dirname, '../../logs/generation'),
      enableDiagnostics: config.enableDiagnostics !== false,
      enableAutoCorrect: config.enableAutoCorrect !== false,
      ...config
    };

    this.proportionalEnforcer = new ProportionalEnforcer();
    this.compositionLock = new CompositionLock();
    this.depthScaler = new DepthScaler();
    this.diagnosticsEngine = new DiagnosticsEngine();

    this.promptTemplates = this.loadPromptTemplates();
    this.negativeTags = this.loadNegativeTags();
    this.compositionTemplates = this.loadCompositionTemplates();

    this.generationHistory = [];
    this.renderMetadata = [];
  }

  toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  toText(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.config.logsPath)) {
      fs.mkdirSync(this.config.logsPath, { recursive: true });
    }
  }

  appendJsonLog(logPath, entry) {
    this.ensureLogsDirectory();
    const logs = fs.existsSync(logPath)
      ? JSON.parse(fs.readFileSync(logPath, 'utf8'))
      : [];
    const safeLogs = Array.isArray(logs) ? logs : [];
    safeLogs.push(entry);
    fs.writeFileSync(logPath, JSON.stringify(safeLogs, null, 2));
  }

  /**
   * Load prompt templates from JSON
   */
  loadPromptTemplates() {
    try {
      const data = fs.readFileSync(this.config.basePromptsPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.warn(`Could not load prompts: ${err.message}`);
      return {};
    }
  }

  /**
   * Load negative tags from JSON
   */
  loadNegativeTags() {
    try {
      const data = fs.readFileSync(this.config.negativeTagsPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.warn(`Could not load negative tags: ${err.message}`);
      return {};
    }
  }

  /**
   * Load composition templates from JSON
   */
  loadCompositionTemplates() {
    try {
      const data = fs.readFileSync(this.config.compositionPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.warn(`Could not load composition templates: ${err.message}`);
      return {};
    }
  }

  /**
   * Main orchestration method: Build complete render configuration
   */
  orchestrateRender(renderRequest = {}) {
    const orchestration = {
      timestamp: new Date().toISOString(),
      requestId: renderRequest.id || this.generateRequestId(),
      promptConfig: {},
      stabilityConfig: {},
      diagnosticsPlan: {},
      fullConfig: {}
    };

    // Step 1: Build prompt from template + composition + negative tags
    orchestration.promptConfig = this.buildPromptConfig(renderRequest);

    // Step 2: Apply stability modules
    orchestration.stabilityConfig = this.buildStabilityConfig(renderRequest);

    // Step 3: Merge into final config
    orchestration.fullConfig = this.mergeConfigurations(
      orchestration.promptConfig,
      orchestration.stabilityConfig,
      renderRequest
    );

    // Step 4: Plan diagnostics if enabled
    if (this.config.enableDiagnostics) {
      orchestration.diagnosticsPlan = this.planDiagnostics();
    }

    // Log metadata
    this.logRenderMetadata(orchestration);
    this.generationHistory.push(orchestration);

    return orchestration;
  }

  /**
   * Build complete prompt configuration
   */
  buildPromptConfig(renderRequest) {
    renderRequest = renderRequest || {};

    const config = {
      basePrompt: '',
      compositionPrompt: '',
      negativePrompt: '',
      finalPrompt: '',
      tags: [],
      antiStretchingTags: [],
      compositionTags: [],
      depthTags: []
    };

    // Select or build base prompt
    const templateKey = renderRequest.promptTemplate || 'anime_woman_portrait';
    const template = this.promptTemplates?.[templateKey];

    if (template) {
      config.basePrompt = this.buildFromTemplate(template);
    } else {
      config.basePrompt = this.toText(renderRequest.customPrompt, 'A beautiful anime woman');
    }

    // Add composition instructions
    const compositionKey = renderRequest.composition || 'portrait_9_16';
    const compositionTemplate = this.compositionTemplates?.[compositionKey];
    if (compositionTemplate) {
      config.compositionPrompt = this.buildCompositionPrompt(compositionTemplate);
    }

    // Build negative tags
    config.antiStretchingTags = this.toArray(this.proportionalEnforcer.generateAntiStretchingTags());
    config.compositionTags = this.toArray(this.compositionLock.generateCompositionTags());
    config.depthTags = this.toArray(this.depthScaler.generateDepthTags());

    // Compile all positive tags
    config.tags = [
      ...config.basePrompt.split(','),
      ...config.compositionPrompt.split(','),
      ...config.antiStretchingTags,
      ...config.compositionTags,
      ...config.depthTags
    ]
      .filter(Boolean)
      .map(t => String(t).trim())
      .filter(Boolean);

    // Build comprehensive negative prompt
    config.negativePrompt = this.buildNegativePrompt();

    // Assemble final prompt
    config.finalPrompt = [config.basePrompt, config.compositionPrompt].filter(Boolean).join('. ');

    return config;
  }

  /**
   * Build stability configuration
   */
  buildStabilityConfig(renderRequest) {
    renderRequest = renderRequest || {};

    const config = {
      proportionalEnforcement: {},
      compositionLocking: {},
      depthScaling: {}
    };

    // Proportional enforcement
    config.proportionalEnforcement = {
      enabled: true,
      headToBodyRatio: this.proportionalEnforcer?.config?.headToBodyRatio,
      shoulderWidth: this.proportionalEnforcer?.config?.shoulderWidth,
      limbLength: this.proportionalEnforcer?.config?.limbLength,
      faceHeightRatio: this.proportionalEnforcer?.config?.faceHeightRatio,
      antiStretchingTags: this.toArray(this.proportionalEnforcer.generateAntiStretchingTags())
    };

    // Composition locking
    const compositionKey = renderRequest.composition || 'portrait_9_16';
    const compositionTemplate = this.compositionTemplates?.[compositionKey];
    if (compositionTemplate) {
      config.compositionLocking = {
        enabled: true,
        template: compositionKey,
        safeZone: compositionTemplate.safeZone || {},
        constraints: this.toArray(compositionTemplate.constraints),
        cameraInstructions: this.toArray(this.compositionLock.generateCameraInstructions())
      };
    }

    // Depth scaling
    config.depthScaling = {
      enabled: true,
      depthConfiguration: this.depthScaler.generateDepthConfiguration() || {},
      depthTags: this.toArray(this.depthScaler.generateDepthTags())
    };

    return config;
  }

  /**
   * Build template-based prompt
   */
  buildFromTemplate(template) {
    const sections = [template?.base, template?.composition, template?.lighting, template?.focus]
      .map((part) => this.toText(part))
      .filter(Boolean);
    return sections.join('. ');
  }

  /**
   * Build composition-specific prompt additions
   */
  buildCompositionPrompt(compositionTemplate) {
    const description = this.toText(compositionTemplate?.description);
    const cameraDistance = this.toText(compositionTemplate?.camera?.distance);
    const cameraFocus = this.toText(compositionTemplate?.camera?.focus);
    const cameraPrompt = [
      cameraDistance ? `Camera distance: ${cameraDistance}` : '',
      cameraFocus ? `Focus: ${cameraFocus}` : ''
    ].filter(Boolean).join('. ');

    return [description, cameraPrompt].filter(Boolean).join('. ');
  }

  /**
   * Build comprehensive negative prompt
   */
  buildNegativePrompt() {
    const negTags = this.negativeTags || {};
    const all = [
      ...this.toArray(negTags.anatomical_errors),
      ...this.toArray(negTags.face_errors),
      ...this.toArray(negTags.composition_errors),
      ...this.toArray(negTags.lighting_errors),
      ...this.toArray(negTags.depth_errors),
      ...this.toArray(negTags.quality_errors),
      ...this.toArray(negTags.aspect_ratio_errors),
      ...this.toArray(negTags.mandatory_exclusions)
    ].map((tag) => this.toText(tag)).filter(Boolean);

    return all.join(', ');
  }

  /**
   * Merge all configurations into final render config
   */
  mergeConfigurations(promptConfig, stabilityConfig, renderRequest) {
    return {
      prompt: promptConfig.finalPrompt,
      negativePrompt: promptConfig.negativePrompt,
      tags: promptConfig.tags,
      model: renderRequest.model || 'default',
      samplingMethod: renderRequest.samplingMethod || 'DPM++',
      steps: renderRequest.steps || 25,
      guidance: renderRequest.guidance || 7.5,
      seed: renderRequest.seed || Math.floor(Math.random() * 1000000),
      stability: stabilityConfig,
      composition: promptConfig.compositionPrompt
    };
  }

  /**
   * Plan diagnostic checks
   */
  planDiagnostics() {
    return {
      enabled: true,
      checks: [
        'anatomical_stretching',
        'feature_slicing',
        'feature_duplication',
        'overexposure',
        'depth_distortion',
        'proportion_errors'
      ],
      runAfterGeneration: true,
      autoCorrectEnabled: this.config.enableAutoCorrect
    };
  }

  /**
   * Process render output through diagnostics
   */
  processRenderOutput(renderOutput) {
    const result = {
      renderOutput: renderOutput,
      diagnostics: null,
      passed: true
    };

    if (this.config.enableDiagnostics) {
      result.diagnostics = this.diagnosticsEngine.diagnose(renderOutput) || {};
      result.passed = result.diagnostics.overall === 'PASS';

      if (!result.passed && this.config.enableAutoCorrect) {
        result.corrections = this.toArray(result.diagnostics.correctionsSuggested);
        result.recommendations = this.toArray(result.diagnostics.recommendations);
      }
    }

    this.logRenderOutput(result);
    return result;
  }

  /**
   * Log render metadata
   */
  logRenderMetadata(orchestration) {
    const logPath = path.join(this.config.logsPath, 'generation_history.log');
    const entry = {
      timestamp: new Date().toISOString(),
      requestId: orchestration.requestId,
      promptConfig: orchestration.promptConfig,
      stabilityConfig: orchestration.stabilityConfig
    };

    try {
      this.appendJsonLog(logPath, entry);
    } catch (err) {
      console.error(`Failed to log metadata: ${err.message}`);
    }
  }

  /**
   * Log render output and diagnostics
   */
  logRenderOutput(result) {
    const logPath = path.join(this.config.logsPath, 'error_reports.log');
    
    if (!result.passed || (result.diagnostics?.detections?.length || 0) > 0) {
      try {
        this.appendJsonLog(logPath, {
          timestamp: new Date().toISOString(),
          status: result.passed ? 'PASS' : 'FAIL',
          diagnostics: result.diagnostics
        });
      } catch (err) {
        console.error(`Failed to log errors: ${err.message}`);
      }
    }
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `ION-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Get comprehensive status
   */
  getStatus() {
    return {
      generationsProcessed: this.generationHistory.length,
      diagnosticsEnabled: this.config.enableDiagnostics,
      diagnosticsSummary: this.diagnosticsEngine.getSummary(),
      proportionalEnforcerStatus: this.proportionalEnforcer.getViolationReport(),
      compositionStatus: {
        driftDetections: this.toArray(this.compositionLock?.driftDetections).length,
        pattern: this.compositionLock.detectDriftPattern()
      },
      depthStatus: {
        analysisCount: this.toArray(this.depthScaler?.depthAnalysis).length,
        patterns: this.depthScaler.detectDepthPatterns()
      }
    };
  }
}

module.exports = IonRenderController;
