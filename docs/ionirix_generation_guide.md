# Ionirix Image Generation Stability Guide
**A comprehensive walkthrough of Ion's stabilized generation pipeline**

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Modules](#core-modules)
4. [Prompt Engineering](#prompt-engineering)
5. [Render Pipeline](#render-pipeline)
6. [Diagnostics System](#diagnostics-system)
7. [Common Issues & Fixes](#common-issues--fixes)
8. [Configuration Guide](#configuration-guide)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This guide explains how Ion's stabilized generation system prevents the major failure modes:
- **Stretching**: Elongated limbs, distorted torsos
- **Slicing**: Cropped faces, missing foreheads
- **Duplication**: Extra eyes, duplicate features
- **Composition Drift**: Off-center characters, inconsistent framing
- **Lighting Issues**: Overexposure, harsh shadows, inconsistent illumination
- **Depth Problems**: Warped backgrounds, insufficient depth separation

### Key Components
- **Proportional Enforcer**: Maintains realistic anatomy ratios
- **Composition Lock**: Ensures stable, predictable character positioning
- **Depth Scaler**: Manages depth-of-field, lighting, and background coherence
- **Diagnostics Engine**: Auto-detects and reports rendering failures
- **Render Controller**: Orchestrates all modules into a cohesive pipeline

---

## Architecture

```
IonRenderController
├── Prompt Engineering System
│   ├── base_prompts.json (templates)
│   ├── negative_tags.json (anti-failure tags)
│   └── composition_templates.json (framing rules)
├── Stability Modules
│   ├── ProportionalEnforcer (anatomy correction)
│   ├── CompositionLock (positioning)
│   └── DepthScaler (lighting & depth)
├── Diagnostics Engine
│   ├── Detection rules
│   ├── Auto-correction logic
│   └── Pattern learning
└── Render Pipeline
    ├── Prompt merging
    ├── Config generation
    ├── Output validation
    └── Error logging
```

---

## Core Modules

### 1. Proportional Enforcer
**File**: `ION-image-engine/stability/proportional_enforcer.js`

**Purpose**: Maintains anatomically correct proportions to prevent stretching.

**Key Settings**:
```javascript
headToBodyRatio: 1 / 7.5        // Natural human proportion
shoulderWidth: 0.25             // Of body height
limbLength: 0.43                // Arms and legs as % of body
faceHeightRatio: 0.12           // Face as % of body
torsoRatio: 0.28                // Torso length ratio
toleranceMargin: 0.05           // 5% allowed variation
```

**Usage**:
```javascript
const enforcer = new ProportionalEnforcer();
const dimensions = { headHeight: 100, bodyHeight: 750, ... };
const analysis = enforcer.enforceProportions(dimensions);
```

**Anti-Stretching Tags**:
```
realistic proportions
natural anatomy
no stretched limbs
no elongated torso
no distorted features
anatomically correct
balanced proportions
consistent dimensions
```

---

### 2. Composition Lock
**File**: `ION-image-engine/stability/composition_lock.js`

**Purpose**: Ensures stable, predictable character positioning and framing.

**Key Settings**:
```javascript
headPositionY: 0.35             // Head ~1/3 from top
headToFrameRatio: 0.25          // Head ~25% of frame height
targetAspectRatio: 9 / 16       // Portrait format
allowHorizontalShift: 0.10      // ±10% max shift
safeZoneTop: 0.15, Bottom: 0.85 // Safe framing zone
```

**Usage**:
```javascript
const lock = new CompositionLock();
const frameData = { characterX: 0.5, characterY: 0.35, ... };
const analysis = lock.validateComposition(frameData);
```

**Composition Tags**:
```
centered composition
portrait framing
head and shoulders visible
balanced positioning
stable character placement
clear focal point
consistent framing
no off-center drift
```

---

### 3. Depth Scaler
**File**: `ION-image-engine/stability/depth_scaler.js`

**Purpose**: Manages depth-of-field, lighting consistency, and background coherence.

**Key Settings**:
```javascript
depthOfFieldStrength: 0.4       // Blur strength
focusDistance: 0.5              // Character should be in focus
lightingConsistency: 0.8        // 0-1, higher = more consistent
mainLightAngle: 45              // degrees
fillLightRatio: 0.3             // Fill as % of main light
backgroundSimplicity: 0.7       // Keep background simple
```

**Usage**:
```javascript
const scaler = new DepthScaler();
const renderData = { characterDepth: 0.5, backgroundDepth: 0.1, ... };
const analysis = scaler.analyzeDepthIssues(renderData);
```

**Depth Tags**:
```
clear depth separation
soft, consistent lighting
well-lit background
no harsh shadows
balanced illumination
coherent background
stable depth field
no depth distortion
character in focus
blurred background
```

---

## Prompt Engineering

### Prompt Templates
**File**: `ION-image-engine/prompts/base_prompts.json`

Templates define consistent base prompts for different scenarios:

```json
{
  "anime_woman_portrait": {
    "base": "A serene anime woman...",
    "composition": "Medium portrait framing...",
    "style": "Anime art style...",
    "lighting": "Soft natural light...",
    "focus": "Face: calm and beautiful..."
  }
}
```

### Negative Tags Strategy
**File**: `ION-image-engine/prompts/negative_tags.json`

Seven categories of exclusions prevent specific failure modes:

1. **anatomical_errors** (9 tags): Stretching, distortion, proportion errors
2. **face_errors** (9 tags): Slicing, cropping, duplication
3. **composition_errors** (8 tags): Drift, off-centering
4. **lighting_errors** (9 tags): Overexposure, harsh shadows
5. **depth_errors** (7 tags): Warping, distortion
6. **quality_errors** (8 tags): Duplication, artifacts
7. **aspect_ratio_errors** (7 tags): Stretching, distortion
8. **mandatory_exclusions** (10 tags): Quality standards

### Composition Templates
**File**: `ION-image-engine/prompts/composition_templates.json`

Five composition types with specific constraints:

```json
{
  "portrait_9_16": {
    "framing": "head-and-shoulders",
    "constraints": {
      "characterPosition": "centered horizontally",
      "characterVerticalPosition": "35% from top",
      "minHeadDistance": "20% of frame height",
      "maxHeadDistance": "30% of frame height"
    },
    "safeZone": {
      "top": 0.15,
      "bottom": 0.85,
      "left": 0.15,
      "right": 0.85
    }
  }
}
```

---

## Render Pipeline

### Using IonRenderController
**File**: `ION-image-engine/renderer/ion_render_controller.js`

The controller orchestrates the entire generation pipeline:

```javascript
const IonRenderController = require('./ION-image-engine/renderer/ion_render_controller');

const controller = new IonRenderController({
  enableDiagnostics: true,
  enableAutoCorrect: true
});

// Build render configuration
const renderRequest = {
  id: 'gen-001',
  promptTemplate: 'anime_woman_portrait',
  composition: 'portrait_9_16',
  model: 'ion-anime-stable',
  steps: 25,
  guidance: 7.5
};

const orchestration = controller.orchestrateRender(renderRequest);
console.log(orchestration.fullConfig);

// Process output with diagnostics
const renderOutput = { /* ... */ };
const result = controller.processRenderOutput(renderOutput);
```

### Output Structure
```javascript
{
  timestamp: '2024-05-09T...',
  requestId: 'ION-1234567890-abc123def456',
  promptConfig: {
    basePrompt: '...',
    compositionPrompt: '...',
    negativePrompt: '...',
    finalPrompt: '...',
    tags: [...]
  },
  stabilityConfig: {
    proportionalEnforcement: {...},
    compositionLocking: {...},
    depthScaling: {...}
  },
  fullConfig: {
    prompt: '...',
    negativePrompt: '...',
    model: 'ion-anime-stable',
    samplingMethod: 'DPM++ 2M Karras',
    steps: 25,
    guidance: 7.5
  }
}
```

---

## Diagnostics System

### DiagnosticsEngine
**File**: `ION-image-engine/diagnostics/diagnostics_engine.js`

Automatically detects six categories of errors:

1. **Anatomical Stretching**: Elongated limbs, distorted proportions
2. **Feature Slicing**: Cropped face, missing features
3. **Feature Duplication**: Extra eyes, duplicate features
4. **Overexposure**: Bright, harsh, inconsistent lighting
5. **Depth Distortion**: Warped background, insufficient separation
6. **Proportion Errors**: Head-body ratio issues

### Running Diagnostics
```javascript
const diagnostics = new DiagnosticsEngine();
const renderOutput = { /* render data */ };
const report = diagnostics.diagnose(renderOutput);

console.log(report.overall);        // PASS, FAIL, CRITICAL
console.log(report.detections);     // Identified issues
console.log(report.recommendations); // Suggested fixes
```

### Diagnostic Report
```javascript
{
  overall: 'PASS' | 'FAIL' | 'CRITICAL',
  detections: [
    {
      type: 'ANATOMICAL_STRETCHING',
      severity: 'HIGH',
      indicators: ['ELONGATED_TORSO'],
      details: [...]
    }
  ],
  recommendations: [
    {
      detection: 'ANATOMICAL_STRETCHING',
      action: 'Enable proportional enforcer with strict mode',
      priority: 'HIGH'
    }
  ],
  correctionsSuggested: [
    {
      issue: 'ELONGATED_TORSO',
      correction: 'proportionalEnforcer.torsoRatio = 0.28'
    }
  ]
}
```

---

## Common Issues & Fixes

### Issue 1: Face Slicing (Cropped Forehead/Chin)

**Symptoms**:
- Forehead cut off at top of frame
- Chin missing or cropped
- Eyes partially hidden

**Root Cause**:
- Head positioned too high or too low
- Camera zoom too close
- Face-focus weight too high

**Fix**:
```yaml
# In render_settings.yaml
composition:
  headPositionY: 0.35      # Adjust from default
  headToFrameRatio: 0.25   # Ensure adequate head space

# Reduce face focus weight
faceHandling:
  faceDetailWeight: 0.8    # Reduce from 1.2
```

**Prompt Adjustment**:
```
Add: "complete head in frame", "full face visible"
Add to negative: "no cropped face", "no sliced chin"
```

### Issue 2: Stretching (Elongated Limbs/Torso)

**Symptoms**:
- Limbs unnaturally long
- Torso stretched vertically
- Body proportions distorted

**Root Cause**:
- Proportional enforcer weight too low
- Conflicting prompt guidance
- Model default bias toward elongation

**Fix**:
```yaml
# In render_settings.yaml
stability:
  proportional:
    strictMode: true
    toleranceMargin: 0.03    # Reduce from 0.05
    limbLength: 0.43
    torsoRatio: 0.28

# In anatomy section
anatomy:
  antiStretching:
    enabled: true
    torsoLimit: 0.28         # Strict limit
    limbLimit: 0.43
```

**Prompt Adjustment**:
```
Add multiple anti-stretching tags:
"realistic proportions", "natural anatomy", 
"no stretched limbs", "no elongated torso"
```

### Issue 3: Duplication (Extra Eyes/Features)

**Symptoms**:
- Multiple eyes or noses
- Extra limbs or heads
- Duplicated facial features

**Root Cause**:
- Ambiguous or unclear prompt
- Model confusion on feature count
- Layer isolation not enabled

**Fix**:
```javascript
// Enable layer isolation in render config
const renderConfig = {
  layerIsolation: true,
  featureProtection: {
    eyes: 2,
    noses: 1,
    mouths: 1
  }
};
```

**Prompt Adjustment**:
```
Clarify feature count:
- Instead of: "woman with beautiful eyes"
- Use: "woman with two eyes"

Add negative tags:
"no extra features", "no duplicated eyes"
```

### Issue 4: Overexposure (Harsh/Blown-Out Lighting)

**Symptoms**:
- Image too bright overall
- Harsh shadows
- Inconsistent lighting
- Blown highlights

**Root Cause**:
- Main light intensity too high
- Insufficient fill light
- No lighting consistency enforcement

**Fix**:
```yaml
# In render_settings.yaml
stability:
  depth:
    lightingConsistency: 0.85    # Increase from 0.8
    fillLightRatio: 0.4          # Increase from 0.3
    mainLightAngle: 45           # Adjust angle if needed

# In model_config.yaml
lighting:
  mainLight:
    intensity: 0.8               # Reduce from 1.0
  fillLight:
    intensity: 0.4               # Increase from 0.3
```

**Prompt Adjustment**:
```
Add lighting control tags:
"soft natural light", "balanced illumination",
"no harsh shadows", "no overexposure"
```

### Issue 5: Composition Drift (Off-Center Character)

**Symptoms**:
- Character shifted left/right
- Head positioned too high/low
- Inconsistent framing between generations

**Root Cause**:
- Composition lock weight insufficient
- Conflicting prompt guidance
- Model drift tendency

**Fix**:
```yaml
# In render_settings.yaml
stability:
  composition:
    strictMode: true
    centerHorizontal: true
    allowHorizontalShift: 0.05   # Reduce from 0.10
    headPositionY: 0.35
    safeZoneTop: 0.15
    safeZoneBottom: 0.85

qa:
  checks:
    - composition_stability       # Add to checks
```

**Prompt Adjustment**:
```
Add composition tags:
"centered composition", "balanced positioning",
"stable character placement", "no off-center drift"
```

### Issue 6: Background Distortion/Warping

**Symptoms**:
- Background appears warped or melted
- Depth mismatch with character
- Background too chaotic

**Root Cause**:
- Insufficient depth separation
- Background too complex
- Depth-of-field settings incorrect

**Fix**:
```yaml
# In render_settings.yaml
stability:
  depth:
    depthOfFieldStrength: 0.5     # Increase from 0.4
    focusDistance: 0.5             # Ensure character is focused
    
background:
  simplicity: 0.8                 # Increase from 0.7
  maxVariance: 0.15               # Decrease from 0.2
  depthSeparation: 0.5            # Increase from 0.4
```

**Prompt Adjustment**:
```
Simplify background:
- Instead of: "character in detailed city scene"
- Use: "character with simple background"

Add tags:
"clear depth separation", "coherent background",
"no warped background", "simple environment"
```

---

## Configuration Guide

### Quick Setup Checklist

1. **Render Settings** (`config/render_settings.yaml`)
   - Set output dimensions (720x1280 for 9:16)
   - Adjust sampling method and steps
   - Enable diagnostics and logging

2. **Model Configuration** (`config/model_config.yaml`)
   - Verify LoRA weights are enabled
   - Set anatomy enforcement to strict
   - Configure face protection options

3. **Diagnostics Rules** (`ION-image-engine/diagnostics/diagnostics_rules.yaml`)
   - Set detection thresholds
   - Define correction strategies
   - Configure quality gates

4. **Prompt Templates** (`ION-image-engine/prompts/base_prompts.json`)
   - Add custom templates as needed
   - Define character-specific instructions
   - Set style preferences

### Critical Settings

**For Maximum Stability (Recommended)**:
```yaml
# render_settings.yaml
stability:
  proportional:
    strictMode: true
    toleranceMargin: 0.03
  composition:
    strictMode: true
    allowHorizontalShift: 0.05
  depth:
    strictMode: true

diagnostics:
  enabled: true
  autoCorrectEnabled: true
  thresholds:
    stretchingRatio: 1.25      # Tighter threshold
```

**For Balanced Quality/Stability**:
```yaml
stability:
  proportional:
    strictMode: true
    toleranceMargin: 0.05
  composition:
    strictMode: true
    allowHorizontalShift: 0.10
  depth:
    strictMode: true

diagnostics:
  enabled: true
  autoCorrectEnabled: true
```

**For Experimental/Creative Rendering**:
```yaml
stability:
  proportional:
    strictMode: false
    toleranceMargin: 0.10
  composition:
    strictMode: false
    allowHorizontalShift: 0.20
  depth:
    strictMode: false

diagnostics:
  enabled: true
  autoCorrectEnabled: false    # Flag issues but don't auto-correct
```

---

## Troubleshooting

### Renders Failing Diagnostics Repeatedly

**Problem**: High failure rate despite diagnostic checks

**Solutions**:
1. Check model compatibility
2. Verify LoRA weights are loaded
3. Reduce guidance scale (7.5 → 6.5)
4. Increase sampling steps (25 → 30)
5. Switch to higher-quality base model

### Same Error Recurring

**Problem**: Specific issue appears in multiple renders

**Solution**: Use pattern detection to identify root cause
```javascript
const patterns = diagnosticsEngine.getCommonIssues();
console.log(patterns); // Shows most frequent issues
```

Apply targeted correction from [Common Issues & Fixes](#common-issues--fixes).

### Generator Producing Different Results with Same Seed

**Problem**: Non-deterministic output despite seed setting

**Solutions**:
1. Set `eta: 0.0` in sampler config (deterministic mode)
2. Ensure seed is properly propagated to model
3. Check if model updates are clearing cache

### Configuration Not Being Applied

**Problem**: Changes to YAML files not taking effect

**Solutions**:
1. Restart render controller or application
2. Clear any prompt caches
3. Verify YAML syntax is correct
4. Check file paths in controller initialization

### Performance Issues

**Problem**: Slow rendering or timeout errors

**Solutions**:
1. Reduce sampling steps (25 → 20)
2. Disable depth-of-field temporarily
3. Reduce diagnostic check frequency
4. Use simpler composition template

---

## Next Steps

1. **Test Integration**: Run test renders with your setup
2. **Monitor Patterns**: Use logs to identify recurring issues
3. **Tune Parameters**: Adjust thresholds based on results
4. **Document Custom Templates**: Add domain-specific prompts
5. **Implement Version Control**: Track configuration evolution

---

**For issues or questions, refer to error logs in `logs/generation/` or check diagnostic reports.**
