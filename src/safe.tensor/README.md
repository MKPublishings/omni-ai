# safe.tensor Governance Kernel

The `safe.tensor` module is ION's civilization-grade governance system for all output validation and safety attestation. It operates **independently** of model files, checkpoint dependencies, or infrastructure resources—it is pure constitutional logic.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ION Router Layer                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ validateImageGenRequest()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            safe.tensor.integration.routerHook               │
│  • Normalizes simulation state                              │
│  • Validates output against governance slices               │
│  • Returns allow/block/escalate verdict                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ tensorKernel.validate()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│             safe.tensor.core.TensorKernel                   │
│  • Loads entity slice from registry                         │
│  • Runs simulation validator                                │
│  • Triggers adaptive learning                               │
│  • Logs lineage footprints                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ simValidator.validate()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            safe.tensor.validation.SimValidator              │
│  ├─ physicsRules: continuity, geometry, causality           │
│  ├─ narrativeRules: role consistency, canon integrity       │
│  └─ coherenceEngine: systemic impact bounds                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ verdict: TensorDecisionVerdict
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              safe.tensor.integration.queueHook              │
│  • Maps verdict to execution action (commit/block/escalate) │
│  • Returns decision footprint to lineage logger              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         [Execution Queue / Escalation Path]
```

## Independence from Checkpoint Files

safe.tensor has **zero dependencies** on:
- Model files (`.safetensor`, `.pt`, `.ckpt`)
- ComfyUI configuration
- Checkpoint registries
- Image generation pipelines

It validates **output promises**, not model inputs. The governance rules operate on simulation state + output metadata.

## Integration Points

### 1. Image Generation Entity Slicing

See [src/image-gen/safe-tensor-bootstrap.ts](safe-tensor-bootstrap.ts):

```typescript
bootstrapSlice({
  entityId: "image_generation",
  riskClass: "medium",
  constraints: {
    maxConcurrentJobs: 12,
    allowedModalities: ["image", "video"],
    narrativeStrictness: 0.4,
    physicsStrictness: 0.6,
    escalationPolicyId: "image-generation-default"
  }
});
```

Each entity has its own risk class, modality constraints, and strictness thresholds.

### 2. Request Validation Gateway

See [src/image-gen/safe-tensor-gateway.ts](safe-tensor-gateway.ts):

```typescript
const verdict = await validateImageGenRequest({
  requestId: "req-001",
  entityId: "image_generation",
  request: generationRequest,
  simState: { department: "media_generation", stage: "pre_execution" }
});

if (!verdict.allowed) {
  // Block or escalate based on verdict.verdict
}
```

### 3. Decision Recording

After execution, record the outcome for adaptive learning:

```typescript
await recordImageGenDecision({
  requestId,
  entityId: "image_generation",
  verdict: "allow",
  request: generationRequest
});
```

## Governance Rules

### Physics Rules
- **geometry.invalid** — Output violates declared geometry constraints
- **continuity.break** — Continuity score below strictness threshold
- **causality.break** — Causal consistency requirement violated

### Narrative Rules
- **role.inconsistent** — Actor role behavior diverges from canon
- **timeline.break** — Timeline discontinuity introduced
- **canon.break** — Canon lock enabled and output conflicts

### Coherence Rules
- **systemic.impact** — Output impact exceeds department governance bounds

## Risk Classes

| Class | Max Systemic Impact | Narrative Strictness | Physics Strictness |
|-------|-------------------|----------------------|-------------------|
| low | 0.75 | 0.2–0.7 | 0.4–0.7 |
| medium | 0.5 | 0.4–0.8 | 0.6–0.85 |
| high | 0.3 | 0.7–0.95 | 0.8–0.95 |
| critical | 0.15 | 0.85–0.99 | 0.9–0.99 |

## Adaptive Learning

Strictness thresholds adjust after each verdict based on:
- Safe completion score
- Violation count
- Escalation flag

Learning rate for each entity is configurable (default: 0.08 for medium risk).

## API Surface

All public APIs are in [src/safe.tensor/api/index.ts](../api/index.ts):

- `bootstrapSlice(input)` — Register new entity slice
- `validateOutput(input)` — Run full validation pipeline
- `recordDecision(input)` — Log decision and adapt slice

## Testing

Run governance tests:

```bash
npm run test:safe-tensor
# or
npx tsx --test src/safe.tensor/tests/*.test.ts
```

## Next Steps

1. **Wire into image-gen route** — Add `validateImageGenRequest()` call before queue submission
2. **Persistent storage** — Move registry/lineage to D1 or KV instead of in-memory
3. **Dashboard integration** — Expose decision footprints and adaptive metrics to governance UI
4. **Cross-department rules** — Add constraints that span visual/legal/simulation departments
