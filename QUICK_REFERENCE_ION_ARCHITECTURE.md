# Quick Reference: Ion ion Architecture

## The Problem You Had
```
ion request failed (400) for /prompt
```

## The Solution: 3-Layer System

### Layer 1: Validation (Catches 400 errors before submission)
**File:** `src/image-gen/backend/gateway/workflow-validator.ts`

```typescript
import { validateionWorkflow, formatValidationErrors } from './workflow-validator';

const result = validateionWorkflow(workflow);
if (!result.valid) {
  console.error(formatValidationErrors(result));
  throw new Error('Invalid workflow');
}
```

### Layer 2: Universal Base Graph (Simplifies workflow building)
**File:** `src/image-gen/backend/templates/universal-base-graph.ts`

```typescript
import { buildUniversalBaseGraph, NODE_IDS } from './templates/universal-base-graph';

const workflow = buildUniversalBaseGraph({
  checkpointName: 'grok-imagine-image-beta',
  positivePrompt: 'a beautiful landscape',
  negativePrompt: 'ugly, distorted',
  width: 512,
  height: 512,
  seed: 42,
  steps: 20,
  cfgScale: 7.0,
});
```

**Node IDs for Expansion:**
```typescript
NODE_IDS.CHECKPOINT         // "1"
NODE_IDS.POSITIVE_ENCODE    // "2"
NODE_IDS.NEGATIVE_ENCODE    // "3"
NODE_IDS.EMPTY_LATENT       // "4"
NODE_IDS.SAMPLER            // "5"
NODE_IDS.VAE_DECODE         // "6"
NODE_IDS.SAVE_IMAGE         // "7"
NODE_IDS.CONTROLNET_ZONE_START   // 100
NODE_IDS.LORA_ZONE_START         // 200
```

### Layer 3: Credit Accounting (Tracks usage + costs)
**Files:** `src/credits/`

```python
from ion_job_runner import IonJobRunner

runner = IonJobRunner("http://127.0.0.1:8188")

# Submit job with credit accounting
result = runner.run_job(
    user_id="mirnes",
    workflow=workflow_dict,
    estimated_cost=4.6
)

# Check result
print(result["status"])  # "completed" or "failed"
print(result["billing"]["charged"])  # Actual cost
```

---

## Validation Error Examples

### ✅ Valid Workflow
```
{
  "1": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": { "ckpt_name": "grok-imagine-image-beta" }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "a cat",
      "clip": ["1", 1]
    }
  },
  ...
}
```

### ❌ Invalid: Missing Required Node
```
Validation Errors:
  - graph: Workflow must include at least one CheckpointLoaderSimple node
```

### ❌ Invalid: Bad Connection Reference
```
Validation Errors:
  - nodes.5.inputs.model [node: 5]: Referenced node "999" does not exist
```

### ❌ Invalid: Bad Dimensions
```
Validation Errors:
  - nodes.4.inputs [node: 4]: Width and height must be multiples of 8
```

---

## Database Schema (Credit System)

```sql
-- User balances
users (user_id TEXT PRIMARY KEY, balance REAL, created_at REAL, updated_at REAL)

-- Credit reservations (during job)
reservations (job_id TEXT PRIMARY KEY, user_id TEXT, amount REAL, timestamp REAL)

-- GPU time tracking (during job)
meter (id INTEGER PRIMARY KEY, job_id TEXT, gpu_ms REAL, timestamp REAL)

-- Final ledger entries (after job)
ledger (
  id INTEGER PRIMARY KEY,
  job_id TEXT,
  user_id TEXT,
  reserved REAL,
  charged REAL,
  refund REAL,
  gpu_ms REAL,
  status TEXT,  -- 'charged' or 'released'
  timestamp REAL
)
```

---

## Credit Flow (What Happens)

```
1. User submits job
2. Ion reserves credits (lock them)
   └─ If balance insufficient → reject immediately
3. Ion validates workflow
   └─ If invalid → release reservation + error
4. Ion submits to ion
   └─ If ion error → release reservation + error
5. Ion polls for completion
   └─ Meters GPU time per node
6. ion finishes
7. Ion charges actual cost
   └─ Refunds any unused reservation
8. Ion returns result + billing info
```

---

## Usage in Your Existing Code

### In `workflow-builder.ts`:
```typescript
// Already integrated! Uses buildUniversalBaseGraph
import { buildUniversalBaseGraph } from './templates/universal-base-graph';
```

### In `ionClient.ts`:
```typescript
// Already integrated! Validates before submission
const validationResult = validateionWorkflow(workflow);
if (!validationResult.valid) {
  throw new Error(`Validation failed:\n${formatValidationErrors(validationResult)}`);
}
```

### To Add Credit Hooks (optional):
```typescript
// In your route handler
const creditRunner = new IonJobRunner("http://127.0.0.1:8188");
const result = await creditRunner.run_job(userId, workflow, estimatedCost);

// Now you have full credit accounting!
console.log(result.billing);  // {"status": "charged", "charged": 4.2, ...}
```

---

## Testing

### Test Validation
```bash
npm run test:image-contract
```

### Test Credit System
```bash
python -m pytest src/credits/ -v
```

### Manual Test
```bash
# GPU server must be running
npm run smoke:image:orchestrator-attestation:image-gen
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Referenced node "X" does not exist` | Bad node connection | Check all `["nodeId", outputIndex]` refs |
| `Width and height must be multiples of 8` | Invalid dimensions | Use 512, 576, 640, 704, 768, etc. |
| `CheckpointLoaderSimple requires ckpt_name` | Missing checkpoint | Check model filename is exact |
| `Workflow must include at least one KSampler` | Missing sampler | Always include the sampling node |
| `Insufficient credits` | User out of credits | Add credits to user balance |

---

## Key Files to Know

```
✅ src/image-gen/backend/gateway/workflow-validator.ts
   → Validates workflows before submission

✅ src/image-gen/backend/templates/universal-base-graph.ts
   → Base template for all workflows

✅ src/image-gen/backend/gateway/ionClient.ts
   → Enhanced with validation + better errors

✅ src/credits/ion_job_runner.py
   → Full job executor with credit accounting

ℹ️  ION_ion_REFACTORING_COMPLETE.md
   → Full documentation with architecture diagrams
```

---

## Next: REST API (Optional)

If you want to expose this as an API:

```typescript
// POST /api/jobs/submit
{
  "user_id": "mirnes",
  "workflow": { ... },
  "estimated_cost": 4.6
}

// Response
{
  "job_id": "ion-uuid",
  "status": "queued",
  "billing": {
    "status": "reserved",
    "amount": 4.6
  }
}
```

---

**Status:** ✅ Complete & Ready to Use

For questions or improvements, check `ION_ion_REFACTORING_COMPLETE.md`
