# ION Media (Image-Only)

`ION_media` provides an ION-native image generation service layer used for local/service integration.

## Scope
- Text/Image prompt input -> image outputs
- Sync generation and async job APIs
- Safety hooks, watermarking, and storage adapters
- **Quantum-cognitive simulation engine for neural stress modeling** (NEW)

## Main Modules

### Image Generation
- `pipeline.py` — request normalization, model routing, generation packaging
- `service.py` — sync + async orchestration, runtime diagnostics
- `http_fastapi.py` — HTTP API (`/v1/generate/image`, `/v1/jobs/*`, admin endpoints)
- `engine.py` — ION backend adapter for image generation
- `model_registry.py` — image profiles and selection
- `storage.py` — local and S3-like adapters

### Quantum-Cognitive Simulation (NEW)
- `quantum_cognitive_sim.py` — Multi-microcolumn avalanche stress simulation
  - QuTiP-based quantum open systems dynamics
  - ZPF-glutamate coupling with E-I balance modulation
  - Automatic solver fallback (mesolve → mcsolve/sesolve)
  - Scale-free Laws graph (Barabási-Albert, 103 nodes)
  - CLI: `--mode avalanche`, configurable gamma/levels/num_cols/ntraj
- `plot_avalanche.py` — Single-run visualization (3-panel PNG traces)
- `plot_avalanche_compare.py` — Multi-run overlay comparison (gamma sweeps)

### Usage Examples

**Image Generation**
```bash
python run_server.py
# or via ASGI runner
```

**Quantum Simulation**
```bash
# Run avalanche stress simulation
python quantum_cognitive_sim.py \
  --mode avalanche \
  --levels 20 \
  --num-cols 3 \
  --gamma 0.1 \
  --ntraj 24 \
  --json-out exports/run.json

# Visualize traces
python plot_avalanche.py --input-json exports/run.json

# Compare multiple runs
python plot_avalanche_compare.py \
  --input-json exports/run1.json exports/run2.json \
  --labels gamma_0.1 gamma_0.5
```

## Environment Notes
- API key auth: `ION_MEDIA_API_KEYS`
- Rate limits: `ION_MEDIA_RATE_LIMIT_*` and window vars
- Optional Redis limiter via `ION_MEDIA_RATE_LIMIT_BACKEND=redis` and `ION_MEDIA_REDIS_URL`

## Run (example)
- Install deps in the target Python environment
- Start FastAPI app through `run_server.py` or your ASGI runner
