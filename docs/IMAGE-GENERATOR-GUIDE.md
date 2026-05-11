# ION Image Generator Guide
**Complete reference for understanding, using, and troubleshooting the ION image generation system**

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [How It Works](#how-it-works)
3. [Supported Features](#supported-features)
4. [Constraints & Limitations](#constraints--limitations)
5. [Prompt Engineering](#prompt-engineering)
6. [Best Practices](#best-practices)
7. [UI Features](#ui-features)
8. [Error Messages & Solutions](#error-messages--solutions)
9. [Technical Details](#technical-details)
10. [Example Prompts](#example-prompts)

---

## Quick Start

The image generator creates images from text descriptions. Simply prompt it like:
- "Create an image of an anime female character"
- "Generate a realistic landscape at sunset"
- "Make a portrait of a wizard in a mystical tower"

The system will:
1. Parse your prompt
2. Route to the Cloudflare AI image generation service
3. Generate an image using Stable Diffusion XL (SDXL)
4. Return a preview in the chat and provide a fullscreen View option

---

## How It Works

### Architecture Overview

```
User Prompt
    ↓
Image Detection (regex pattern matching)
    ↓
Route to /api/image endpoint
    ↓
ION Image Generation Service v3
    ├─ Provider Selection: Cloudflare AI (primary) → ion-native (fallback)
    ├─ Constraint Validation: Clamp dimensions & steps
    ├─ Provider Execution: Call Cloudflare AI
    └─ Response Normalization: Fix MIME types, base64 encoding
    ↓
Client-side Processing
    ├─ Parse JSON/streaming response
    ├─ Normalize image source (detect SVG in PNG wrapper)
    └─ Correct MIME type if mismatched
    ↓
Display in Chat + Fullscreen Preview Modal
```

### Provider Chain

**Primary Provider: Cloudflare AI**
- Model: Stable Diffusion XL Base 1.0 (@cf/stabilityai/stable-diffusion-xl-base-1.0)
- Status: Active, production-ready
- Performance: Fast, reliable, enforces strict parameter limits
- Availability: 100% uptime guarantee (Cloudflare infrastructure)

**Fallback Provider: ION-native SVG Renderer**
- Type: Vector-based SVG renderer
- Status: Active as emergency fallback
- Purpose: Ensures generation never fails completely
- Quality: Demo/placeholder quality (suitable for testing)
- Triggers: Only used if Cloudflare AI is unavailable

**Removed Provider: ComfyUI**
- Status: **Disabled (not available)**
- Why: Requires local server setup; not reliably available in production
- Migration: All ComfyUI routes have been removed from the provider chain
- Note: Images are no longer routed through ComfyUI

---

## Supported Features

### Image Generation
- ✅ Text-to-image generation from any prompt
- ✅ Style guidance (anime, realistic, artistic, photorealistic, etc.)
- ✅ Aspect ratio support (portrait, landscape, square)
- ✅ Character/subject customization
- ✅ Environment and composition control

### UI/UX Features
- ✅ Inline image preview in chat
- ✅ Fullscreen modal for detailed viewing
- ✅ Desktop and mobile support (responsive design)
- ✅ Image download capability
- ✅ Escape key or backdrop click to close preview
- ✅ Proper stacking context (portal-based rendering)
- ✅ Image success messaging with filename

### Quality Control
- ✅ Automatic dimension clamping
- ✅ Automatic step limiting for quality/speed trade-off
- ✅ MIME type correction for proper display
- ✅ Base64 data URL normalization
- ✅ Cross-origin image rendering (via data URL)

---

## Constraints & Limitations

### Dimension Constraints (Cloudflare AI Hard Limits)

| Constraint | Value | Notes |
|-----------|-------|-------|
| **Max Width** | 2048 pixels | Hard limit; requests exceeding this are clamped |
| **Max Height** | 2048 pixels | Hard limit; requests exceeding this are clamped |
| **Min Width** | 256 pixels | Minimum viable dimension |
| **Min Height** | 256 pixels | Minimum viable dimension |
| **Recommended Range** | 512–1024px | Optimal for speed and quality |

**What happens if you exceed limits?**
- Dimensions > 2048px are automatically clamped to 2048px
- Example: Requesting 4096x2048 becomes 2048x2048

### Step/Quality Constraints (Cloudflare AI Hard Limits)

| Constraint | Value | Notes |
|-----------|-------|-------|
| **Max Steps** | 20 | Hard limit for inference quality |
| **Min Steps** | 1 | Works but produces lower quality |
| **Recommended** | 10–20 steps | Best quality/speed balance |
| **Default** | 20 steps | Automatically used if not specified |

**What happens if you request more steps?**
- Requests > 20 steps are clamped to 20
- Quality plateaus around 15–20 steps with SDXL

### Model Constraints

| Constraint | Value |
|-----------|-------|
| **Primary Model** | Stable Diffusion XL Base (SDXL) |
| **Token Limit (Prompt)** | ~77 tokens (standard CLIP limit) |
| **Effective Prompt Length** | ~100–150 words optimal |
| **Negative Prompt Support** | ✅ Yes (via prompt injection) |

**Prompt length guidance:**
- 20–50 words: Sufficient for most requests
- 50–100 words: Detailed, stylistic control
- 100+ words: Risk of token overflow; consider splitting into multiple generations

### Aspect Ratio Recommendations

| Aspect Ratio | Width × Height | Use Case |
|-------------|----------------|----------|
| **Square** | 512×512, 768×768, 1024×1024 | Avatars, thumbnails, portraits |
| **Portrait** | 512×768, 768×1024 | Character art, full-body portraits |
| **Landscape** | 768×512, 1024×768 | Environments, backgrounds, scenes |
| **Ultra-wide** | 1024×512, 1024×576 | Panoramic scenes (use sparingly) |

---

## Prompt Engineering

### Anatomy of a Good Prompt

```
[subject] + [style/quality] + [environment] + [technical specs]
```

#### Subject Clarity
- **Vague**: "a person"
- **Better**: "a young woman with long dark hair"
- **Best**: "a 25-year-old woman with shoulder-length black hair, green eyes, wearing a red dress"

#### Style/Quality Modifiers
- Add quality keywords: "masterpiece", "highly detailed", "professional quality", "cinematic"
- Add art style: "anime", "photorealistic", "oil painting", "digital art", "concept art"
- Add aesthetic: "vibrant colors", "warm lighting", "moody", "bright and cheerful"

#### Environment Specification
- Describe setting: "in a misty forest", "at a coffee shop", "in space"
- Describe lighting: "dramatic shadows", "golden hour", "neon lighting"
- Describe mood: "peaceful", "chaotic", "mysterious", "romantic"

#### Technical Specifications (Optional)
- Camera/framing: "wide shot", "close-up", "overhead view"
- Composition: "centered", "rule of thirds", "shallow depth of field"
- Time/weather: "at night", "during a thunderstorm", "sunny day"

### Style Keywords That Work Well

#### Anime Styles
- "anime girl"
- "anime character"
- "manga art style"
- "cel-shaded"
- "hand-drawn"

#### Photorealistic Styles
- "photorealistic"
- "photo quality"
- "cinematic"
- "professional photography"
- "high-resolution photograph"

#### Artistic Styles
- "oil painting"
- "watercolor"
- "digital art"
- "concept art"
- "illustration"
- "fantasy art"

#### Quality Enhancers
- "masterpiece"
- "highly detailed"
- "intricate details"
- "professional quality"
- "studio lighting"
- "sharp focus"
- "8K"

### Negative Prompt Injection

The system automatically includes safety negatives, but you can emphasize what you DON'T want:

**Common Negatives to Avoid:**
- "deformed", "distorted", "ugly", "bad anatomy"
- "blurry", "low quality", "low resolution"
- "extra limbs", "extra heads", "duplicate"
- "text", "watermark", "signature"

**Example Prompt with Implicit Negatives:**
```
"Create an anime girl with perfect facial symmetry, 
no deformities, crystal clear eyes, professional quality, 
no watermarks, no extra limbs"
```

---

## Best Practices

### 1. Be Specific About Style
❌ DON'T: "Make a picture of a girl"  
✅ DO: "Anime girl with blue eyes, long silver hair, wearing a school uniform, professional quality"

### 2. Use Consistent Terminology
- Mix of different style keywords can confuse the model
- Example: "anime girl in photorealistic style" = conflicting signals
- Pick ONE primary style, then enhance it

### 3. Limit Prompt Length
- 30–80 words is ideal
- Longer prompts don't always yield better results
- Model has ~77 token limit; extremely long prompts may be truncated

### 4. Test Iteratively
- Start with a base prompt
- If result is close but not perfect, refine one aspect at a time
- Don't change everything simultaneously

### 5. Respect Dimension Recommendations
- Use 512×768 for character portraits
- Use 768×512 for landscapes
- Use 1024×1024 for detailed, centered subjects
- Larger dimensions = slower generation but more detail

### 6. Use Fullscreen Preview
- Always use the "View" button for detailed inspection
- Check facial features, hands, anatomy before accepting
- Helps catch common AI art artifacts early

### 7. Download for Backup
- If you get a perfect result, use the download button
- Prevents accidental loss if chat is cleared

### 8. Aesthetic Consistency
- Use the same descriptive style across multiple requests
- Consistent keywords = more predictable results
- Examples: "anime", "photorealistic", "watercolor", "cyberpunk neon"

---

## UI Features

### Inline Preview
- Images appear directly in the chat message
- Shows a thumbnail preview
- Indicates image generation success/status

### Fullscreen Modal (View Button)
- Click "View" to open fullscreen image preview
- Features:
  - Full-viewport display (h-screen w-screen)
  - Image contains within viewport (object-contain)
  - Works on desktop, tablet, and mobile
  - Escape key to close
  - Click backdrop/outside to close
  - Close button always visible
  - Smooth rendering (portal-based to avoid stacking context issues)

### Download Button
- Downloads image with proper filename
- Filename format: `ION-image-[timestamp].png`
- Includes all image metadata (if available)

### Mobile Behavior
- Fullscreen modal adapts to screen size
- Portrait and landscape orientation both supported
- Touch-friendly close buttons
- No modal overflow/clipping issues
- Portal rendering ensures proper z-index stacking

### Desktop Behavior
- Large viewport for detailed inspection
- Centered modal with padding
- Backdrop blur for focus
- Keyboard shortcuts (Escape to close)

---

## Error Messages & Solutions

### "Image generation failed"
**Causes:**
- Cloudflare API unreachable
- Prompt contains filtered/unsafe content
- Request malformed or missing required fields

**Solutions:**
1. Try rephrasing the prompt (avoid potentially unsafe keywords)
2. Check internet connectivity
3. If issue persists, the fallback SVG renderer will engage

### Error 5006 (Validation Failed)
**Causes:**
- Dimensions exceed Cloudflare limits (>2048px)
- Steps exceed limit (>20)
- Invalid parameter format

**Solutions:**
- System automatically clamps dimensions and steps
- If still failing, try reducing dimension by 25–50%
- Try using default 512×512 or 768×768 dimensions

### Blank PNG Response
**Causes:**
- MIME type mismatch (SVG labeled as PNG)
- Base64 encoding corruption
- Provider fallback triggered

**Solutions:**
- System automatically detects and corrects MIME type mismatches
- Refresh and retry
- Check that your browser supports base64 data URLs

### "Prompt too long"
**Causes:**
- Prompt exceeded ~77 tokens (~100–150 words)

**Solutions:**
- Reduce prompt to 50–80 words
- Remove redundant descriptors
- Focus on the most important attributes

### Fallback SVG Generated Instead of Real Image
**Causes:**
- Cloudflare AI unavailable
- Extreme parameter misconfig

**Solutions:**
- SVG is temporary placeholder; wait a moment and retry
- SVG has lower quality; not recommended for production use
- Check if Cloudflare service status is operational

---

## Technical Details

### Request/Response Flow

**Frontend → Backend:**
```json
POST /api/image
{
  "prompt": "anime girl with blue eyes",
  "width": 768,
  "height": 1024,
  "steps": 20,
  "seed": optional
}
```

**Backend Processing:**
1. Clamp dimensions to [256, 2048]
2. Clamp steps to [1, 20]
3. Send to Cloudflare AI
4. Parse binary response (PNG image data)
5. Encode as base64
6. Return with proper MIME type

**Backend → Frontend:**
```json
{
  "success": true,
  "image": {
    "src": "data:image/png;base64,iVBORw0KGgo...",
    "filename": "ION-image-1715399001234.png",
    "dimensions": {
      "width": 768,
      "height": 1024
    }
  }
}
```

**Frontend Normalization:**
1. Detect MIME type from base64 data
2. If SVG detected in PNG wrapper, rewrite as `image/svg+xml`
3. Create `<img>` tag with normalized data URL
4. Display in MessageBubble
5. Provide fullscreen modal via portal

### Code Locations

| Component | File Path | Responsibility |
|-----------|-----------|-----------------|
| **API Route** | `apps/dashboard/src/app/api/image/route.ts` | Accepts image requests, routes to v3 service |
| **v3 Service** | `src/image-gen/v3/image-generation-service.ts` | Core pipeline, dimension/step clamping, provider execution |
| **Runtime Config** | `src/image-gen/v3/runtime-config.ts` | Provider selection, environment-based configuration |
| **Assistant Page** | `apps/dashboard/src/app/assistant/page.tsx` | Detects image prompts, normalizes responses, handles MIME correction |
| **Message Component** | `apps/dashboard/src/components/AIConversationPanel.tsx` | Renders images in chat, fullscreen modal via portal |
| **Worker Entry** | `workers/ION-ai-images/src/index.ts` | Cloudflare Worker wrapper (forces v3 path) |

### Provider Configuration

**Environment Variables:**
```bash
# Primary provider (default: cloudflare-ai)
ION_IMAGE_PROVIDER=cloudflare-ai

# Fallback provider (default: ion-native)
ION_IMAGE_FALLBACK_PROVIDER=ion-native

# Cloudflare AI token (required for production)
CLOUDFLARE_API_TOKEN=<your-token>

# Cloudflare Account ID (required for production)
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
```

### Dimension Clamping Logic

```typescript
function clampCloudflareAiDimensions(width: number, height: number) {
  const MIN = 256;
  const MAX = 2048;
  const STEP = 64; // Must be multiple of 64
  
  // Clamp to range
  let w = Math.max(MIN, Math.min(MAX, width));
  let h = Math.max(MIN, Math.min(MAX, height));
  
  // Align to 64-pixel boundary
  w = Math.round(w / STEP) * STEP;
  h = Math.round(h / STEP) * STEP;
  
  return { width: w, height: h };
}
```

### Step Clamping Logic

```typescript
function clampSteps(steps: number): number {
  const MIN = 1;
  const MAX = 20;
  return Math.max(MIN, Math.min(MAX, steps));
}
```

---

## Example Prompts

### Anime Characters
```
"Cute anime girl with long pink hair, big blue eyes, 
school uniform, holding a cat, soft lighting, 
professional quality, masterpiece"
→ Recommended: 768×1024, 20 steps
```

```
"Serious anime male swordsman with white hair, 
red eyes, dark armor, action pose, detailed background, 
cinematic lighting"
→ Recommended: 768×1024, 20 steps
```

### Photorealistic
```
"A 40-year-old man with salt-and-pepper beard, 
wearing a business suit, office background, 
professional headshot, studio lighting, high quality"
→ Recommended: 512×512, 20 steps
```

```
"Majestic mountain landscape at golden hour, 
snow-capped peaks, pine forests, crystal clear lake, 
photorealistic, 8K quality, cinematic"
→ Recommended: 1024×768, 20 steps
```

### Artistic Styles
```
"Oil painting of a peaceful village in the countryside, 
warm autumn colors, church bell tower, dirt road, 
impressionist style, masterpiece"
→ Recommended: 768×512, 20 steps
```

```
"Cyberpunk neon city street at night, rain-slicked ground, 
holographic signs, flying cars, dystopian aesthetic, 
high detail, professional quality"
→ Recommended: 1024×768, 20 steps
```

### Character Portraits
```
"Fantasy elf ranger with pointed ears, 
emerald eyes, nature-inspired armor, forest background, 
dramatic lighting, concept art, highly detailed"
→ Recommended: 512×768, 20 steps
```

```
"Wizard with long beard, pointy hat, holding glowing staff, 
magical aura, starry background, fantasy art, 
rich colors, magical atmosphere"
→ Recommended: 512×768, 20 steps
```

### Landscapes & Environments
```
"Ancient temple ruins in a lush jungle, 
overgrown vines, sunlight rays through canopy, 
mystical atmosphere, photorealistic, highly detailed, 
cinematic"
→ Recommended: 1024×512, 20 steps
```

```
"Underwater coral reef with colorful fish, 
crystal clear water, sunlight rays, bioluminescent creatures, 
vibrant colors, photorealistic, 8K"
→ Recommended: 1024×768, 20 steps
```

---

## Summary: What You Need to Tell ION

When instructing ION about the image generator, emphasize:

1. **Current Provider**: Cloudflare AI (SDXL)—fast, reliable, hard constraints
2. **Constraints**: Max 2048×2048px, max 20 steps (automatic clamping)
3. **Best Practices**: 
   - Be specific about style (anime, photorealistic, etc.)
   - Use 30–80 word prompts
   - 512–1024px dimensions work best
   - Include quality keywords (masterpiece, highly detailed)
4. **Features**: Fullscreen preview modal, download capability, mobile/desktop support
5. **Quality Tips**: 
   - Specify anatomy details to avoid AI artifacts
   - Use consistent style terminology
   - Test and iterate
6. **Limitations**: ComfyUI is disabled; only Cloudflare AI + SVG fallback
7. **Error Handling**: System auto-corrects MIME types and clamps parameters
8. **UI/UX**: Portal-based rendering ensures proper stacking; works on all devices

---

## Quick Reference Table

| Feature | Status | Details |
|---------|--------|---------|
| Text-to-image | ✅ Active | Works reliably |
| Style control | ✅ Active | Anime, photorealistic, artistic |
| Dimension clamping | ✅ Active | Auto-clamps to 256–2048px |
| Step limiting | ✅ Active | Auto-limits to 1–20 steps |
| Mobile fullscreen | ✅ Active | Portal-based, responsive |
| Image download | ✅ Active | Works with proper filename |
| MIME correction | ✅ Active | Auto-detects SVG in PNG |
| Cloudflare AI | ✅ Active | Primary provider |
| ComfyUI | ❌ Disabled | Removed from provider chain |
| SVG fallback | ✅ Active | Emergency backup only |
| Base64 normalization | ✅ Active | Cross-origin rendering |
| Prompt detection | ✅ Active | Regex-based routing |

---

**Last Updated**: May 11, 2026  
**Version**: 1.0  
**Status**: Production Ready
