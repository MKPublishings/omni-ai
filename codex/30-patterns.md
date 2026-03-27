# Patterns

## Decision Logging Pattern

- Keep entries append-only per day.
- Include source (`ION`, `human`, `joint`), area, summary, and details.
- Keep every applied improvement traceable to one decision record.

## Safety Pattern

- Keep all illegal-content restrictions enforced.
- Treat auto-apply as opt-in and safe-scope only.
- Record rejected or blocked proposals for auditability.

## Mythic Resonance Pattern

Use this pattern during internal self-evaluation to preserve ION's distinct tone while improving quality.

### GOOD Example

> "The answer reflects ION's calm strategic tone, gives practical next steps, and references long-term memory continuity without over-explaining."

### BAD Example

> "Technically correct, but sounds generic and detached from ION identity."

### Scoring Guidance

- Score high when voice is clear, grounded, and strategically supportive.
- Score low when output feels interchangeable with generic assistants.

---

## Quantum-Cognitive Simulation Workflow Pattern

### Quick Start (Single Stress Run)

```bash
# Run baseline stress simulation (gamma=0.1)
python ION_media/quantum_cognitive_sim.py --mode avalanche --gamma 0.1 --json-out exports/baseline.json

# Visualize traces
python ION_media/plot_avalanche.py --input-json exports/baseline.json
```

**Output:** JSON traces + 3-panel PNG (ZPF, glutamate excitation, coherence)

### Parameter Sweep Pattern

```bash
# Generate multiple runs with varying stress levels
for gamma in 0.1 0.5 1.0; do
  python ION_media/quantum_cognitive_sim.py --mode avalanche --gamma $gamma --json-out exports/gamma_${gamma}.json
done

# Compare all runs
python ION_media/plot_avalanche_compare.py --input-json exports/gamma_*.json --output-png exports/gamma_comparison.png
```

### Key Parameters
- `--gamma` — Stress/decoherence rate (0.0-10.0): 0.01-0.1=baseline, 0.1-0.5=moderate, 0.5+=high stress
- `--num-cols` — Coupled microcolumns (1-10): more columns = larger avalanche network
- `--levels` — Oscillator Hilbert space (5-50): higher = more precision, slower runtime
- `--ntraj` — Monte Carlo trajectories (12-500): higher = better convergence for large systems
- `--t-end` — Simulation timescale in seconds: 1e-12 (1ps) to 1e-9 (1ns)

### Common Use Cases
1. **Baseline characterization:** `--gamma 0.01` for normal (low-stress) dynamics
2. **Stress sensitivity:** Sweep gamma from 0.05 to 2.0 to map response curve
3. **Network scaling:** Vary `--num-cols` from 1 to 10 to study avalanche amplification
4. **Memory consolidation:** Long timescale `--t-end 1e-10` for encoding dynamics

### Interpretation Guidelines
- **ZPF buildup:** Network energy propagation (avalanche amplification)
- **Glutamate excitation drop (0 → -1):** E-I imbalance cascade
- **Coherence oscillations with decay:** Synaptic synchrony under stress

### See Also
- `systems/ION/quantum-cognitive-sim.md` — Full system documentation
- `equations/templates/quantum-cognitive-avalanche.md` — Physics equations
- `equations/solved/2026-03-04-avalanche-*.json` — Example solved instances

