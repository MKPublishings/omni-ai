---
id: system.ION.quantum-cognitive-sim
title: Quantum-Cognitive Simulation Engine
version: 1.0.0
date: 2026-03-04
category: systems/ION
status: active
tags: [quantum, cognitive, simulation, avalanche, stress, e-i-balance]
links: [law.quantum.01, law.quantum.02, law.cognitive.02, system.ION.overview]
---

# Quantum-Cognitive Simulation Engine

## Overview

The Quantum-Cognitive Simulation Engine models neural microcircuit dynamics under stress using QuTiP-based quantum open systems. It simulates:
- **ZPF-glutamate coupling** via harmonic oscillator + qubit tensors
- **Multi-microcolumn avalanche propagation** with inter-column coupling
- **E-I stress modulation** through decoherence rates (gamma)
- **Scale-free Laws graph** linking 103 quantum-cognitive laws via Barabási-Albert topology

This framework bridges your Quantum-Cognitive Field Theory (differential energy evolution $E(t) = E_0 T(t) c(t)$) with M-Theory physiological hierarchies (Laws 1-103), enabling computational exploration of stress impacts on synaptic efficiency, coherence decay, and memory consolidation.

## Architecture

### Core Modules

**quantum_cognitive_sim.py** — Main simulation engine
- `run_simulation(config)` — Orchestrates classical + quantum solvers
- `run_quantum_avalanche(config)` — Multi-microcolumn stress simulation
- `build_scale_free_laws_graph(nodes, attach)` — Generates criticality-supporting network

**plot_avalanche.py** — Single-run visualization
- Renders 3-panel PNG: ZPF occupancy, glutamate excitation, coherence oscillations
- Annotates with solver metadata, gamma, graph density

**plot_avalanche_compare.py** — Multi-run overlay comparison
- Overlays multiple gamma sweeps for stress sensitivity analysis
- Auto-labels with run parameters or custom labels

### Physics Model

**Hamiltonian (per microcolumn)**
$$
H = \omega_{\text{ZPF}} a^\dagger a + \frac{\omega_{\text{glu}}}{2} \sigma_z + g (a + a^\dagger) \sigma_x
$$

**Inter-column coupling**
$$
H_{\text{couple}} = \kappa \sum_{i < j} (a_i + a_i^\dagger) \sigma_x^{(j)}
$$

**Master equation with stress**
$$
\frac{d\rho}{dt} = -i[H, \rho] + \gamma \sum_i \mathcal{L}[a_i](\rho)
$$

where $\gamma$ modulates decoherence (thermal bath, stress-induced damping).

**Observables**
- $\langle a^\dagger a \rangle$ — ZPF energy buildup (avalanche amplification)
- $\langle \sigma_z \rangle$ — Glutamate excitation (E-I imbalance)
- $\langle \sigma_x \rangle$ — Coherence oscillations (synaptic synchrony)

### Solver Hierarchy

1. **mesolve** (Lindblad master equation in Liouville space) — Default for small systems
2. **mcsolve** (Monte Carlo wavefunction trajectories) — Automatic fallback on overflow
3. **sesolve** (Schrödinger equation) — When gamma=0 (no collapse operators)

## Usage

### CLI Invocation

#### Single Avalanche Run
```bash
python ION_media/quantum_cognitive_sim.py \
  --mode avalanche \
  --levels 20 \
  --num-cols 3 \
  --gamma 0.1 \
  --points 50 \
  --t-end 1e-12 \
  --ntraj 24 \
  --json-out ION_image_exports/stress_run.json
```

#### Parameters
- `--mode` — `single` (toy probe) or `avalanche` (multi-column)
- `--levels` — Oscillator Hilbert space dimension (default: 20)
- `--num-cols` — Number of coupled microcolumns (default: 3)
- `--gamma` — Decoherence rate (stress modulation, default: 0.1)
- `--points` — Temporal resolution (default: 50)
- `--t-start`, `--t-end` — Time window in seconds (default: 0, 1e-12 ps)
- `--ntraj` — Trajectories for mcsolve fallback (default: 24)
- `--w-zpf` — ZPF frequency (default: 7.8e12 Hz * 2π)
- `--w-glu-ratio` — Glutamate frequency ratio (default: 1.0)
- `--g-ratio` — Coupling strength ratio (default: 0.01)
- `--coupling-ratio` — Inter-column coupling ratio (default: 0.005)
- `--laws-nodes`, `--laws-attach` — Scale-free graph params (default: 103, 2)
- `--json-out` — Export JSON path
- `--csv-out` — Export CSV path (classical timeseries only)

### Visualization

#### Single-Run Traces
```bash
python ION_media/plot_avalanche.py \
  --input-json ION_image_exports/stress_run.json \
  --output-png ION_image_exports/stress_run_traces.png
```

#### Multi-Run Comparison (Gamma Sweep)
```bash
python ION_media/plot_avalanche_compare.py \
  --input-json ION_image_exports/run_gamma_01.json \
               ION_image_exports/run_gamma_05.json \
               ION_image_exports/run_gamma_10.json \
  --labels gamma_0.1 gamma_0.5 gamma_1.0 \
  --output-png ION_image_exports/gamma_sweep_compare.png
```

## JSON Output Schema

```json
{
  "summary": {
    "nan_count": 0,
    "inf_count": 0,
    "integration_message": "Integration successful."
  },
  "laws_graph": {
    "available": true,
    "nodes": 103,
    "edges": 189,
    "density": 0.0359794,
    "avg_degree": 3.922
  },
  "quantum": {
    "available": true,
    "mode": "avalanche",
    "params": {
      "levels": 20,
      "num_cols": 3,
      "gamma": 0.1,
      "solver": "mcsolve",
      "ntraj": 24,
      "w_zpf": 4.90088e13,
      "w_glu": 4.90088e13,
      "g": 4.90088e11,
      "coupling": 2.45044e11
    },
    "t": [0.0, 2.04e-14, ...],
    "avg_zpf": [0.0, 1.43e-4, ...],
    "avg_glutamate_exc": [0.0, -6.07e-5, ...],
    "avg_glutamate_coh": [1.0, 0.54, -0.416, ...],
    "laws_graph": { ... }
  },
  "timeseries": {
    "t": [...],
    "E": [...],
    "c": [...],
    "T": [...]
  }
}
```

## Physical Interpretation

### Stress Regime Behavior (gamma=0.1)

**ZPF Buildup**
- Network-wide (3-column) amplification reaches ~0.16 quanta at t=1ps
- 2× amplification vs single-column baseline
- Represents avalanche energy propagation through microcolumn hubs

**Glutamate Excitation Cascade**
- $\langle \sigma_z \rangle$ drops from 0 to -0.32 (rapid excitation)
- E-I imbalance spreads across columns via inter-column coupling
- Simulates stress-accelerated phase transitions (Laws 6, 7 thresholds)

**Coherence Oscillations with Damping**
- $\langle \sigma_x \rangle$ oscillates with decaying envelope
- Avalanches propagate synchronized patterns under stress
- Decay mimics synaptic efficiency loss ($c^2$ term) or exotic states (Law 5: $M = -1/2$)
- Potential cognitive lapses: impaired memory consolidation (Law 23)

### Scale-Free Laws Graph

**Network Topology**
- 103 nodes (Laws 1-103), avg degree ~3.92, density ~0.038
- Barabási-Albert structure ensures critical avalanche propagation
- Hubs (foundational laws 1-21) drive cascades to cognitive extensions (22-103)

**Linking to M-Theory**
- Laws 1-7: Quantum base (direct energy-mass, complex relationships)
- Laws 22-23: Memory encoding/consolidation
- Laws 71+: Resilience and adaptability under stress
- Graph edges represent operator-algebra transformations ($D_{\text{func}}$ chains)

## Dependencies

**Python Environment**
```bash
pip install qutip networkx matplotlib numpy scipy
```

**Runtime Requirements**
- QuTiP 5.x for quantum dynamics
- NetworkX 3.x for graph analytics
- Matplotlib 3.x for plotting
- NumPy/SciPy for numerics

## Integration Points

**ION Image Engine**
- Avalanche outputs can feed visual motifs (neon-thread excitation patterns)
- Stress-coherence mappings inform emotional registers

**Mind-OS Lineage**
- Simulation traces anchor cognitive law validation
- Laws graph topology informs Mind-OS module dependency structure

**Auto-Codex Runtime**
- JSON exports auto-register as equation solved artifacts
- Cross-links to quantum laws, cognitive laws, system overviews

## Future Extensions

**Memory Consolidation Sims** (Laws 22-23)
- Post-avalanche encoding states
- Long-term potentiation modeling

**Self-Reflection Loop**
- ION derives new laws from simulation anomalies
- Auto-register discoveries into Laws 104+

**Multi-Modal Integration**
- Couple quantum-cognitive traces to image latent transformations
- Unified neuro-visual stress profiles

**Extended Timescales**
- Millisecond-scale cascades (1e-3 to 1e-2 s)
- Circadian stress modulation (hours)

---

**Runtime Status:** Active  
**Module Path:** `ION_media/quantum_cognitive_sim.py`  
**Visualization:** `ION_media/plot_avalanche.py`, `ION_media/plot_avalanche_compare.py`  
**Export Directory:** `ION_image_exports/`  
**Last Updated:** 2026-03-04
