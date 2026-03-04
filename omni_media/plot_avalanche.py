from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


def _load_payload(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file_handle:
        return json.load(file_handle)


def _validate_avalanche_payload(payload: dict) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, dict, dict]:
    quantum = payload.get("quantum", {})
    if not quantum.get("available", False):
        reason = quantum.get("reason", "quantum payload unavailable")
        raise ValueError(f"Quantum payload unavailable: {reason}")
    if quantum.get("mode") != "avalanche":
        raise ValueError("JSON does not contain avalanche-mode quantum traces")

    t = np.asarray(quantum.get("t", []), dtype=float)
    zpf = np.asarray(quantum.get("avg_zpf", []), dtype=float)
    exc = np.asarray(quantum.get("avg_glutamate_exc", []), dtype=float)
    coh = np.asarray(quantum.get("avg_glutamate_coh", []), dtype=float)

    if t.size == 0 or zpf.size == 0 or exc.size == 0 or coh.size == 0:
        raise ValueError("Missing one or more avalanche arrays in quantum payload")
    if not (t.size == zpf.size == exc.size == coh.size):
        raise ValueError("Avalanche arrays are not the same length")

    params = quantum.get("params", {})
    graph = quantum.get("laws_graph", {})
    return t, zpf, exc, coh, params, graph


def render_avalanche_plot(input_json: Path, output_png: Path) -> Path:
    payload = _load_payload(input_json)
    t, zpf, exc, coh, params, graph = _validate_avalanche_payload(payload)

    output_png.parent.mkdir(parents=True, exist_ok=True)

    fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
    time_ps = t * 1e12

    axes[0].plot(time_ps, zpf, linewidth=2)
    axes[0].set_ylabel("Avg ZPF n")
    axes[0].grid(alpha=0.25)

    axes[1].plot(time_ps, exc, linewidth=2)
    axes[1].set_ylabel("Avg glutamate sigma_z")
    axes[1].grid(alpha=0.25)

    axes[2].plot(time_ps, coh, linewidth=2)
    axes[2].set_ylabel("Avg glutamate coherence sigma_x")
    axes[2].set_xlabel("Time (ps)")
    axes[2].grid(alpha=0.25)

    solver = params.get("solver", "unknown")
    gamma = params.get("gamma", "n/a")
    num_cols = params.get("num_cols", "n/a")
    levels = params.get("levels", "n/a")
    ntraj = params.get("ntraj", "n/a")
    density = graph.get("density", "n/a")
    avg_degree = graph.get("avg_degree", "n/a")

    fig.suptitle(
        "Omni Avalanche Stress Traces\n"
        f"solver={solver}, gamma={gamma}, num_cols={num_cols}, levels={levels}, ntraj={ntraj}, "
        f"graph_density={density}, graph_avg_degree={avg_degree}",
        fontsize=11,
    )
    fig.tight_layout(rect=[0, 0, 1, 0.95])
    fig.savefig(output_png, dpi=160)
    plt.close(fig)
    return output_png


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render avalanche traces from Omni simulation JSON")
    parser.add_argument("--input-json", required=True, type=str, help="Path to avalanche simulation JSON")
    parser.add_argument(
        "--output-png",
        type=str,
        default=None,
        help="Output PNG path (default: same directory/stem as input with _traces.png)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_json = Path(args.input_json)
    if args.output_png is None:
        output_png = input_json.with_name(f"{input_json.stem}_traces.png")
    else:
        output_png = Path(args.output_png)

    written = render_avalanche_plot(input_json, output_png)
    print(f"Avalanche plot written: {written}")


if __name__ == "__main__":
    main()
