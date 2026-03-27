from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file_handle:
        return json.load(file_handle)


def _extract_avalanche(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, str]:
    payload = _load_json(path)
    quantum = payload.get("quantum", {})
    if not quantum.get("available", False):
        raise ValueError(f"{path}: quantum payload unavailable")
    if quantum.get("mode") != "avalanche":
        raise ValueError(f"{path}: payload mode is not avalanche")

    t = np.asarray(quantum.get("t", []), dtype=float)
    zpf = np.asarray(quantum.get("avg_zpf", []), dtype=float)
    exc = np.asarray(quantum.get("avg_glutamate_exc", []), dtype=float)
    coh = np.asarray(quantum.get("avg_glutamate_coh", []), dtype=float)
    if t.size == 0 or zpf.size == 0 or exc.size == 0 or coh.size == 0:
        raise ValueError(f"{path}: missing avalanche arrays")
    if not (t.size == zpf.size == exc.size == coh.size):
        raise ValueError(f"{path}: avalanche arrays are not equal length")

    params = quantum.get("params", {})
    gamma = params.get("gamma", "?")
    ntraj = params.get("ntraj", "?")
    solver = params.get("solver", "?")
    auto_label = f"{path.stem} (gamma={gamma}, ntraj={ntraj}, {solver})"
    return t, zpf, exc, coh, auto_label


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare ION avalanche JSON runs")
    parser.add_argument(
        "--input-json",
        nargs="+",
        required=True,
        help="One or more avalanche JSON files",
    )
    parser.add_argument(
        "--labels",
        nargs="*",
        default=None,
        help="Optional labels matching the number of input files",
    )
    parser.add_argument(
        "--output-png",
        type=str,
        default="ION_image_exports/avalanche_compare.png",
        help="Output PNG path",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_paths = [Path(p) for p in args.input_json]

    if args.labels is not None and len(args.labels) not in (0, len(input_paths)):
        raise ValueError("--labels must be omitted or have one label per --input-json")

    series: list[tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, str]] = []
    for idx, path in enumerate(input_paths):
        t, zpf, exc, coh, auto_label = _extract_avalanche(path)
        if args.labels and len(args.labels) == len(input_paths):
            label = args.labels[idx]
        else:
            label = auto_label
        series.append((t, zpf, exc, coh, label))

    output_path = Path(args.output_png)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fig, axes = plt.subplots(3, 1, figsize=(13, 10), sharex=True)
    for t, zpf, exc, coh, label in series:
        time_ps = t * 1e12
        axes[0].plot(time_ps, zpf, linewidth=1.8, label=label)
        axes[1].plot(time_ps, exc, linewidth=1.8, label=label)
        axes[2].plot(time_ps, coh, linewidth=1.8, label=label)

    axes[0].set_ylabel("Avg ZPF n")
    axes[1].set_ylabel("Avg glutamate sigma_z")
    axes[2].set_ylabel("Avg glutamate coherence sigma_x")
    axes[2].set_xlabel("Time (ps)")

    for ax in axes:
        ax.grid(alpha=0.25)
        ax.legend(loc="best", fontsize=8)

    fig.suptitle("ION Avalanche Comparison", fontsize=12)
    fig.tight_layout(rect=[0, 0, 1, 0.96])
    fig.savefig(output_path, dpi=160)
    plt.close(fig)
    print(f"Avalanche comparison plot written: {output_path}")


if __name__ == "__main__":
    main()
