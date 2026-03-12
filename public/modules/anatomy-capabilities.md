# Omni Anatomy Capabilities

Omni AI includes a human anatomy stack in `omni_ai/` with subsystem boundaries that can be reasoned about in chat.

## Top-level modules

- `omni_ai.anatomy`
  - Exposes subsystem namespaces: `arms`, `body`, `legs`, `routing`, `spine`, `torso`.
- `omni_ai.human`
  - Exposes `head_api`, `NECK_REGISTRY`, `Scenario`, and `simulate_population`.

## Head subsystem entrypoint

- Function: `omni_ai.human.head.api.head(subsystem, operation, payload)`
- Contract envelope:
  - `system`: `human_head`
  - `subsystem`: selected head subsystem
  - `operation`: action name
  - `payload`: operation inputs

## Integration details

- Head integration graph tooling exists under `omni_ai.human.head.integration`.
- Registry validation is covered in `tests/test_head_unittest.py` and `tests/test_head_neck_trace_unittest.py`.
- Canonical aliases and graph consistency are maintained in head registry and integration validators.

## Practical chat mapping

When users ask anatomy questions, map requests to:

1. Target subsystem (head, neck, torso, arms, legs, spine, routing).
2. Operation intent (inspect, explain, search, validate, simulate).
3. Payload shape and expected structured output.

Prefer subsystem-specific guidance over generic anatomy prose.
