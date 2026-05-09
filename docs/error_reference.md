# Error Reference & Resolution Guide
**Quick lookup for Ion's rendering errors and their solutions**

---

## Error Categories

### CRITICAL Errors (Must Fix Before Output)

#### 1. FEATURE_SLICING
**Description**: Face or features are cropped at frame edges

**What to Look For**:
- Forehead cut off at top
- Chin missing or cropped
- Eyes partially hidden
- Profile edges cut

**Auto-Detection**: Yes
**Auto-Correct**: No (flags output)

**Immediate Fix**:
```javascript
controller.compositionLock.config.headPositionY = 0.35;  // Adjust position
controller.compositionLock.config.safeZoneTop = 0.2;     // Expand zone
```

**Configuration Fix**:
```yaml
composition:
  headPositionY: 0.35        # Move head down from 0.3
  safeZoneTop: 0.2           # Expand safe zone
faceHandling:
  faceDetailWeight: 0.8      # Reduce face focus
```

**Prompt Fix**:
```
Remove: Prompts emphasizing extreme close-up
Add: "complete head in frame", "no cropped face"
Negative: "no cropped face", "no sliced chin", "no hidden features"
```

---

#### 2. FEATURE_DUPLICATION
**Description**: Extra or duplicate facial features (multiple eyes, noses, mouths)

**What to Look For**:
- More than 2 eyes
- More than 1 nose
- Extra mouths or chins
- Blended/overlapping features

**Auto-Detection**: Yes
**Auto-Correct**: Partial (suggests corrections)

**Immediate Fix**:
```javascript
const renderConfig = {
  layerIsolation: true,
  featureProtection: {
    eyes: { count: 2, enforcement: 'strict' },
    noses: { count: 1, enforcement: 'strict' },
    mouths: { count: 1, enforcement: 'strict' }
  }
};
```

**Configuration Fix**:
```yaml
# model_config.yaml
faceHandling:
  detailedFace: true

# Prompt clarity
# DON'T use: "beautiful eyes" (ambiguous count)
# DO use: "woman with two eyes"
```

**Prompt Fix**:
```
Clarity is key:
Original: "A woman with stunning eyes and a beautiful smile"
Better: "A woman with two eyes and one mouth, smiling"

Negative tags:
"no extra features", "no duplicated eyes", "no duplicated mouth"
```

---

#### 3. ANATOMICAL_STRETCHING
**Description**: Limbs, torso, or body parts unnaturally elongated

**What to Look For**:
- Arms longer than natural (>0.45 of body)
- Legs unnaturally long
- Torso stretched vertically
- Neck too long or thin
- Features disproportionate overall

**Auto-Detection**: Yes
**Auto-Correct**: Suggested corrections provided

**Immediate Fix**:
```javascript
controller.proportionalEnforcer.config.toleranceMargin = 0.03;  // Stricter
controller.proportionalEnforcer.config.enableStrictMode = true;
```

**Configuration Fix**:
```yaml
stability:
  proportional:
    strictMode: true
    toleranceMargin: 0.03      # Tight tolerance
    limbLength: 0.43
    torsoRatio: 0.28
    headToBodyRatio: 0.1333

anatomy:
  antiStretching:
    enabled: true
    torsoLimit: 0.28
    limbLimit: 0.43
```

**Prompt Fix**:
```
Add multiple tags:
"realistic proportions", "natural anatomy",
"no stretched limbs", "no elongated torso",
"anatomically correct", "balanced proportions",
"consistent dimensions", "no distorted features"

Guidance: Reduce from 7.5 → 6.5
(Lower guidance = more model freedom but can hurt quality)
```

**Advanced Fix** (if still failing):
```javascript
// Reduce model guidance scale
const renderConfig = {
  guidance: 6.5,              // Reduce from 7.5
  steps: 30,                  // Increase steps
  samplingMethod: 'DPM++ 2M'  // Use stable sampler
};
```

---

### HIGH Severity Errors

#### 4. OVEREXPOSURE / LIGHTING_INCONSISTENCY
**Description**: Image too bright, harsh shadows, or inconsistent lighting

**What to Look For**:
- Average frame brightness > 0.85
- Harsh, high-contrast shadows
- Spotty or uneven illumination
- Blown-out highlights
- One side dark, other bright

**Auto-Detection**: Yes
**Auto-Correct**: Suggested corrections provided

**Immediate Fix**:
```javascript
controller.depthScaler.config.lightingConsistency = 0.9;
controller.depthScaler.config.fillLightRatio = 0.5;
```

**Configuration Fix**:
```yaml
stability:
  depth:
    lightingConsistency: 0.85    # Increase from 0.8
    fillLightRatio: 0.4          # Increase fill light

lighting:
  mainLight:
    intensity: 0.8               # Reduce from 1.0
    softness: "high"             # More diffuse
  fillLight:
    intensity: 0.4               # Increase from 0.3
    softness: "high"
```

**Prompt Fix**:
```
Add lighting tags:
"soft natural light", "balanced illumination",
"no harsh shadows", "no overexposure",
"gentle shadows", "even lighting"

Negative tags:
"no blown highlights", "no harsh shadows",
"no spotty lighting", "no inconsistent illumination"
```

---

#### 5. DEPTH_DISTORTION / BACKGROUND_INCOHERENCE
**Description**: Background appears warped, distorted, or doesn't match character

**What to Look For**:
- Background appears melted or warped
- Character and background lighting don't match
- Depth too shallow (background too close)
- Background texture inconsistent
- Halos or fringing at depth edges

**Auto-Detection**: Yes
**Auto-Correct**: Suggested corrections provided

**Immediate Fix**:
```javascript
controller.depthScaler.config.backgroundSimplicity = 0.8;
controller.depthScaler.config.depthOfFieldStrength = 0.5;
```

**Configuration Fix**:
```yaml
stability:
  depth:
    depthOfFieldStrength: 0.5    # Increase from 0.4
    focusDistance: 0.5
    blurFalloff: "quadratic"

background:
  simplicity: 0.8               # Increase from 0.7
  maxVariance: 0.15             # Decrease from 0.2
  coherence: "high"
  depthSeparation: 0.5          # Increase from 0.4
```

**Prompt Fix**:
```
Simplify background:
DON'T use: "detailed city street in background"
DO use: "simple background"

Add tags:
"clear depth separation", "coherent background",
"no warped background", "stable depth field",
"simple background", "well-integrated background"

Negative tags:
"no depth distortion", "no merged layers",
"no warped background", "no background blur"
```

---

#### 6. COMPOSITION_DRIFT
**Description**: Character positioned inconsistently, off-center, or outside safe framing

**What to Look For**:
- Character shifted left or right unexpectedly
- Head too high or too low in frame
- Variable positioning between generations
- Aspect ratio inconsistent
- Character outside safe zone boundaries

**Auto-Detection**: Yes
**Auto-Correct**: Auto-corrects positioning

**Immediate Fix**:
```javascript
controller.compositionLock.config.allowHorizontalShift = 0.05;  // Tighten
controller.compositionLock.config.centerHorizontal = true;
```

**Configuration Fix**:
```yaml
stability:
  composition:
    strictMode: true
    centerHorizontal: true
    allowHorizontalShift: 0.05   # Reduce from 0.10
    headPositionY: 0.35
    safeZoneTop: 0.15
    safeZoneBottom: 0.85
```

**Prompt Fix**:
```
Add composition tags:
"centered composition", "portrait framing",
"head and shoulders visible", "balanced positioning",
"stable character placement", "consistent framing"

Negative tags:
"no off-center drift", "no vertical drift",
"no floating elements"
```

---

### MEDIUM Severity Errors

#### 7. PROPORTION_ERROR
**Description**: Head-to-body ratio or limb proportions don't match natural anatomy

**What to Look For**:
- Head seems too large or too small for body
- Face taller/shorter than expected
- Shoulders too narrow or wide
- Overall proportions feel off

**Auto-Detection**: Yes
**Auto-Correct**: Suggested corrections

**Configuration Fix**:
```yaml
stability:
  proportional:
    headToBodyRatio: 0.1333      # 1:7.5, strict
    shoulderWidth: 0.25
    faceHeightRatio: 0.12
    torsoRatio: 0.28
    toleranceMargin: 0.03        # Tighter tolerance
```

---

#### 8. FACE_HEIGHT_ANOMALY
**Description**: Face appears unusually large or small relative to body

**What to Look For**:
- Large head with small body
- Tiny face with large body
- Face doesn't fit proportionally

**Auto-Detection**: Yes

**Configuration Fix**:
```yaml
anatomy:
  limbProportions:
    headHeight: 0.1333           # 1 / 7.5 ratio
  antiStretching:
    faceLimit: 0.15              # Max face ratio
```

---

## Diagnostic Report Interpretation

### Sample Report
```json
{
  "overall": "CRITICAL",
  "detections": [
    {
      "type": "FEATURE_SLICING",
      "severity": "CRITICAL",
      "indicators": ["FOREHEAD_CROPPED", "CHIN_CROPPED"],
      "details": [{
        "issue": "Forehead cut off at frame top",
        "distance": 0.03,
        "threshold": 0.05
      }]
    }
  ],
  "recommendations": [{
    "detection": "FEATURE_SLICING",
    "action": "Reduce face-focus weight and increase zoom-out",
    "priority": "CRITICAL"
  }],
  "correctionsSuggested": [{
    "issue": "FOREHEAD_CROPPED",
    "correction": "compositionLock.headPositionY = 0.4"
  }]
}
```

**Reading This**:
1. `overall: CRITICAL` → Image failed quality gate
2. `detections` → Specific issues identified
3. `recommendations` → System-level fixes to apply
4. `correctionsSuggested` → Specific parameter adjustments

---

## Auto-Correction Process

When `enableAutoCorrect: true`, the system automatically suggests and logs corrections:

```javascript
// From diagnostics report
correctionsSuggested: [
  { issue: 'ELONGATED_TORSO', correction: 'proportionalEnforcer.torsoRatio = 0.28' },
  { issue: 'HIGH_OVERALL_BRIGHTNESS', correction: 'lighting.mainLight.intensity = 0.8' }
]
```

**Next Steps**:
1. Review corrections in `logs/generation/error_reports.log`
2. Apply corrections to `config/render_settings.yaml` or `config/model_config.yaml`
3. Re-run generation with updated configuration

---

## Pattern Learning

When the same error occurs 3+ times:

```javascript
diagnosticsEngine.detectPatterns();
// Returns:
{
  "recurring_stretching": {
    "occurrences": 5,
    "action": "increase_proportional_enforcement"
  }
}
```

**Action**: System automatically suggests parameter adjustments in next generation cycle.

---

## Log Files Reference

**Location**: `logs/generation/`

- **generation_history.log**: All render metadata (prompts, configs, etc.)
- **error_reports.log**: Detailed diagnostics for failed renders
- **diagnostics.log**: Pattern analysis and learning updates

---

## Recovery Steps for Persistent Issues

### If One Error Type Keeps Recurring

1. **Check Logs**:
   ```
   tail -f logs/generation/error_reports.log
   ```

2. **Identify Pattern**:
   ```javascript
   const summary = diagnosticsEngine.getSummary();
   console.log(summary.commonIssues);
   ```

3. **Find Root Cause**:
   - Configuration conflict?
   - Model limitation?
   - Prompt ambiguity?
   - External factor?

4. **Apply Targeted Fix**:
   - Adjust specific module configuration
   - Refine prompt template
   - Try different model or sampler

5. **Validate**:
   - Run 10 test renders
   - Check success rate
   - Verify no regressions

---

## Emergency Fallback

If rendering consistently fails:

```yaml
# Reduce to most conservative settings
render:
  steps: 20              # Minimum quality
  guidanceScale: 6.0     # Reduce guidance

stability:
  proportional:
    toleranceMargin: 0.10
  composition:
    allowHorizontalShift: 0.15

diagnostics:
  enabled: false         # Disable diagnostics temporarily
```

Then:
1. Get baseline render
2. Gradually increase complexity
3. Monitor for regressions
4. Re-enable diagnostics once stable

---

**For detailed troubleshooting, refer to `ionirix_generation_guide.md`**
