# Ionirix Simulation Capabilities

Ionirix includes a dedicated simulation stack under `omni_ai/simulation/` with layered orchestrators.

## Public orchestrators

- `simulate_intercivilizational_dynamics`
- `simulate_grand_strategy`
- `simulate_megaprojects`
- `simulate_existential_risks`
- `simulate_post_crisis_evolution`
- `simulate_multicivilization_timelines`

## Engine primitives

- `SimulationEngine`
- `run_simulation_tick`
- `compute_interaction_vectors`

## Shared helpers

- Utility layer in `omni_ai/simulation/_utils.py`:
  - `as_id`, `as_name`, `get_nested`, `clamp`, `average`, `relation_lookup`

## Config-driven controls

- Interaction weights can be tuned via `interaction_weights` (0.0-3.0).
- Event thresholds can be tuned via `event_thresholds` keys such as:
  - `treaty`, `trade_agreement`, `cultural_exchange_culture`, `cultural_exchange_transport`, `dispute`, `innovation_race`.

## Test coverage

- `tests/test_simulation_stack_unittest.py`
- `tests/test_simulation_engine_unittest.py`
- `tests/test_population_simulation_unittest.py`

## Practical chat mapping

When simulation is requested, return structured outputs with:

1. Current state snapshot.
2. Rules/constraints used.
3. Transition events executed.
4. Key risk notes and next-step scenarios.

Keep simulation outputs deterministic when constraints are explicit.
