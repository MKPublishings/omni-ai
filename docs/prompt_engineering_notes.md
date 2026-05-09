# Prompt Engineering for Ion Stability
**Advanced techniques for building prompts that prevent rendering failures**

---

## Core Principles

### 1. Clarity Over Creativity
Clear, unambiguous prompts produce more stable results.

**Bad** (ambiguous):
```
A beautiful woman with stunning features in an artistic scene
```

**Good** (clear):
```
A 25-year-old anime woman with large eyes, black hair, 
standing upright, facing forward, professional portrait lighting
```

**Why**: The model wastes processing power guessing what you mean. Explicit specs prevent mistakes.

---

### 2. Anatomical Precision
Specify exact body positions and proportions.

**Bad**:
```
A woman in a flattering pose
```

**Good**:
```
A woman standing upright with shoulders back, arms at sides,
head level with shoulders, feet shoulder-width apart
```

**Why**: Prevents stretched limbs and composition drift.

---

### 3. Lighting Pre-Definition
Define lighting before the model generates it.

**Bad**:
```
A woman under nice lighting
```

**Good**:
```
A woman lit by soft natural light from the left side,
warm skin tone, gentle shadows, no harsh contrast
```

**Why**: Prevents overexposure and lighting inconsistencies.

---

### 4. Negative Tag Strategy
Use comprehensive negative tags to block failure modes.

**Template**:
```
Positive: [base description]
Negative: [8+ specific exclusions from error categories]
```

---

## Prompt Template Anatomy

### Structure
```
[Character description] + [Composition] + [Lighting] + [Style] + [Quality tags]
```

### Example Breakdown
```
Base:
"A serene 24-year-old anime woman"
→ Defines character age, demeanor, art style

Anatomy:
"with oval face, large expressive eyes, black hair,
slender build, proportionate limbs"
→ Prevents duplication, distortion, stretching

Composition:
"standing centered in frame, head and shoulders visible,
looking calm, professional portrait pose"
→ Ensures stable positioning

Lighting:
"lit by warm natural light from the upper left,
soft shadows on face, well-lit throughout"
→ Prevents overexposure

Style:
"anime illustration style, detailed, professional quality,
smooth shading, vibrant colors"
→ Sets visual direction

Quality:
"high resolution, no artifacts, clean lines, polished"
→ Sets quality threshold
```

---

## Building Stable Prompts

### Step 1: Start with Template
```javascript
const template = basePrompts['anime_woman_portrait'];
let prompt = template.base;  // Provides safe starting point
```

### Step 2: Add Composition Specifics
```javascript
const composition = compositionTemplates['portrait_9_16'];
prompt += `. ${composition.description}. 
Head positioned ${composition.constraints.characterVerticalPosition}.`;
```

### Step 3: Specify Anatomy Precisely
```javascript
prompt += `. Anatomy: head and shoulders visible, 
proportionate limbs, natural proportions, no distortion.
Face: complete and unobstructed.`;
```

### Step 4: Define Lighting
```javascript
prompt += `. Lighting: soft natural light from ${angle} degrees,
warm tones, balanced fill light, no harsh shadows,
no overexposure, consistent illumination.`;
```

### Step 5: Merge with Negative Tags
```javascript
const negativePrompt = buildNegativePrompt();
// Combines 50+ quality control tags
```

---

## Negative Tag Best Practices

### Mandatory Exclusions (Always Include)
```
no stretching, no distortion, no artifacts,
no bad anatomy, no poorly drawn hands,
no worst quality, no low quality, no watermark
```

### Error-Specific Exclusions

**For Stretching Prevention**:
```
no stretched limbs, no elongated torso,
no abnormal proportions, no distorted features,
no exaggerated dimensions, no warped anatomy
```

**For Slicing Prevention**:
```
no cropped face, no sliced chin, no cropped forehead,
no hidden eyes, no cut-off features, no partial head,
no off-frame elements
```

**For Duplication Prevention**:
```
no extra eyes, no duplicate features,
no multiple heads, no merged faces,
no overlapping limbs, no extra hands
```

**For Lighting Prevention**:
```
no harsh shadows, no blown highlights,
no overexposed areas, no underexposed areas,
no spotty lighting, no uneven illumination,
no high contrast lighting
```

**For Depth Prevention**:
```
no warped background, no merged layers,
no depth distortion, no background blur bleeding,
no unnatural depth, no floating elements
```

### Composition Prevention
```
no off-center framing, no floating character,
no cut-off at edges, no tilted composition,
no unbalanced positioning
```

---

## Advanced Techniques

### Technique 1: Emphasis Keywords

**Standard**:
```
A woman with beautiful eyes and elegant features
```

**With Emphasis**:
```
A woman with (beautiful eyes) and (elegant features)
```

**Effect**: Model gives extra processing weight to emphasized terms.

**Usage in Ion**:
```javascript
// In basePrompt
"A woman with (proportionate anatomy) and (stable framing)"
```

---

### Technique 2: Negative Guidance

Use negative examples to define what NOT to generate:

```
A woman, definitely not stretched or distorted,
definitely not cropped or sliced,
definitely not with duplicate features,
definitely not with harsh lighting
```

**Why It Works**: Double-negative reinforcement often strengthens model behavior.

---

### Technique 3: Progressive Refinement

If a generation has specific issues, build next prompt addressing them:

```javascript
// First generation has stretched limbs
// Second prompt adds:
prompt += ". Arms and legs must maintain natural proportions: 
arm length is 43% of body height, leg length is 43% of body height."
```

---

### Technique 4: Anchor Points

Use specific references to stabilize generation:

```
A woman with features similar to [reference character style]
Proportions similar to [realistic human reference]
Lighting similar to [photography style reference]
```

---

## Character-Specific Prompt Building

### For Anime Characters
```
Template: "A [age]-year-old anime woman with [hair color] hair,
[eye description], [facial features], [body type]"

Example:
"A 23-year-old anime woman with long black hair,
large expressive eyes, soft facial features, slender build,
standing in professional portrait pose, calm expression"
```

### For Semi-Realistic Characters
```
Template: "A [age]-year-old woman with [ethnicity] features,
[hair description], [distinctive features], [style]"

Example:
"A 26-year-old woman with East Asian features,
wavy shoulder-length brown hair, warm expression,
wearing casual clothing, soft natural lighting"
```

### For Fantasy/Stylized Characters
```
Template: "A [character type] with [magical features],
[style] illustration style, [composition], [atmosphere]"

Example:
"A fairy maiden with ethereal wings and glowing aura,
watercolor painting style, standing in mystical forest,
soft dreamy lighting, professional art quality"
```

---

## Composition Prompt Phrases

### For Portrait (Head & Shoulders)
```
"Medium close-up portrait, head and shoulders visible,
centered in frame, character looking directly forward,
professional photography pose"
```

### For Full Body
```
"Full body portrait, character standing upright,
all limbs visible and complete, centered composition,
feet visible at frame bottom, head with space above"
```

### For Waist-Up
```
"Waist-up shot, character from head to waist,
centered positioning, natural arms visible,
professional portrait framing"
```

### For Three-Quarter View
```
"Three-quarter view pose, character turned 45 degrees,
showing dimension while keeping face visible,
natural turned posture"
```

---

## Testing & Validation

### Quick Test Prompt
```
A 25-year-old anime woman with black hair,
standing in professional pose, portrait orientation,
soft lighting, calm expression, no artifacts or distortion
```

**Use this to test:**
- Baseline stability
- Model responsiveness
- Default behavior

### Progressive Difficulty Test
1. **Basic**: Simple single character
2. **Intermediate**: Added styling/atmosphere
3. **Advanced**: Complex composition/scenario
4. **Expert**: Edge cases

---

## Common Prompt Mistakes & Fixes

### Mistake 1: Ambiguous Feature Counts
```
❌ WRONG: "A woman with beautiful eyes"
✅ RIGHT: "A woman with two eyes"

❌ WRONG: "Hands on body"
✅ RIGHT: "Two hands at sides"
```

### Mistake 2: Conflicting Instructions
```
❌ WRONG: "Extreme close-up of full body"
✅ RIGHT: "Medium close-up of face and shoulders"

❌ WRONG: "Stretched arms naturally positioned"
✅ RIGHT: "Naturally proportioned arms"
```

### Mistake 3: Vague Anatomy
```
❌ WRONG: "Beautiful body"
✅ RIGHT: "Athletic build, well-proportioned"

❌ WRONG: "Perfect posture"
✅ RIGHT: "Standing upright, shoulders back, chest forward"
```

### Mistake 4: Overloaded Prompts
```
❌ WRONG: 500+ word prompt with conflicting details
✅ RIGHT: 100-200 words, focused on key features

Reason: Model processes every word, creating conflicts
```

### Mistake 5: Missing Negative Guidance
```
❌ WRONG: [Positive prompt only]
✅ RIGHT: [Positive prompt] + [50+ negative tags]

Reason: Negative tags are 50% of stability strategy
```

---

## Prompt Engineering Checklist

Before generating, verify:

- [ ] Character age/appearance clearly specified
- [ ] Body position and posture explicitly described
- [ ] Composition framing defined
- [ ] Lighting direction and quality specified
- [ ] Style and medium defined
- [ ] At least 40+ negative tags included
- [ ] No contradictory instructions
- [ ] Prompt 100-300 words (not too short, not too long)
- [ ] No ambiguous feature counts
- [ ] Quality standards clearly stated

---

## Template Library

### Template: Professional Headshot
```
A [age]-year-old woman with [hair], [eye color] eyes,
[skin tone] skin, [facial features]. Professional headshot
with neutral background, studio lighting from left,
warm soft illumination, no harsh shadows, centered framing,
head and shoulders visible, calm expression, high quality.
```

### Template: Fashion Portrait
```
A [age]-year-old woman wearing [clothing], with [hair],
[distinctive features]. Fashion portrait pose, elegant
posture, confidence in expression, professional lighting,
neutral background, full body or waist-up, high fashion
illustration quality, polished finish.
```

### Template: Character Art
```
[Character description], [character details], standing in
[scene/setting], [action or pose], [magical/special elements].
[Art style] illustration, professional quality, detailed
features, atmospheric lighting, cohesive composition,
[mood/feeling], polished artwork.
```

### Template: Romantic Portrait
```
A [age]-year-old woman with [appearance], expressing
[emotion], surrounded by [romantic elements]. Three-quarter
view pose, gentle lighting, soft focus background, romantic
atmosphere, [clothing/styling], professional illustration,
beautiful composition, dreamy aesthetic.
```

---

## Integration with Ion's System

### Using Prompts with IonRenderController

```javascript
const controller = new IonRenderController();

const renderRequest = {
  promptTemplate: 'anime_woman_portrait',  // or custom
  customPrompt: "A 24-year-old anime woman with...",  // optional override
  composition: 'portrait_9_16',
  model: 'ion-anime-stable'
};

const orchestration = controller.orchestrateRender(renderRequest);

// System automatically:
// 1. Loads your prompt
// 2. Validates against bad patterns
// 3. Merges with composition template
// 4. Adds 50+ negative tags
// 5. Applies stability rules
// 6. Generates final config
```

---

## Continuous Improvement

### Learning from Failures

```javascript
// When diagnostics report STRETCHING:
const failedPrompt = "A woman with long arms";
const correctedPrompt = "A woman with arms proportioned 
to 43% of body height, natural human anatomy";
```

**Update template if pattern appears 3+ times:**
```javascript
// Add to negativePrompting rules
ADD_TO_NEGATIVE_TAGS("Stretching detected 3+ times: add arm-length specs")
```

---

**Next: Use these principles with the error reference guide to build bulletproof prompts.**
