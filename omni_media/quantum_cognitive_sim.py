from __future__ import annotations

import argparse
import csv
import importlib
import json
from pathlib import Path
import warnings
from dataclasses import dataclass
from typing import Any

import numpy as np
from scipy.integrate import odeint

try:
    import networkx as nx
except Exception:
    nx = None

try:
    qt = importlib.import_module("qutip")
except Exception:
    qt = None


@dataclass
class SimulationConfig:
    alpha: float = 0.01
    beta: float = 0.8
    e0: float = 1.0
    t_start: float = 0.0
    t_end: float = 10.0
    points: int = 100
    d_cap: float = 1000.0
    csv_out: str | None = None
    json_out: str | None = None


def i_func(e: float) -> float:
    return e


def t_func(e: float) -> float:
    return 2.0 * e


def b_func(e: float) -> float:
    return e**2


def d_func(e: float | np.ndarray, d_cap: float) -> float:
    e_scalar = float(np.atleast_1d(e)[0])
    transformed = t_func(b_func(t_func(i_func(e_scalar))))
    return float(min(transformed, d_cap))


def d_e_dt(e: float | np.ndarray, _: float, alpha: float, beta: float, d_cap: float) -> float:
    e_scalar = float(np.atleast_1d(e)[0])
    d_val = d_func(e_scalar, d_cap)
    return alpha * d_val - beta * e_scalar


def build_laws_graph() -> dict[str, Any]:
    if nx is None:
        return {"available": False, "reason": "networkx not installed"}

    graph = nx.Graph()
    for law_id in range(1, 104):
        graph.add_node(law_id, label=f"Law {law_id}")
    for i in range(1, 22):
        for j in range(22, 104, 10):
            graph.add_edge(i, j)

    return {
        "available": True,
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "density": float(nx.density(graph)),
    }


def run_quantum_probe(time_points: np.ndarray, e_series: np.ndarray) -> dict[str, Any]:
    if qt is None:
        return {"available": False, "reason": "qutip not installed"}

    hamiltonian = qt.sigmax()
    initial_state = qt.basis(2, 0)
    collapse_ops = [float(np.mean(e_series)) * qt.sigmaz()]
    result = qt.mesolve(hamiltonian, initial_state, time_points, collapse_ops)

    probs = [float(np.abs(state.full()[0, 0]) ** 2) for state in result.states]
    return {
        "available": True,
        "probs": probs,
        "avg_e": float(np.mean(e_series)),
    }


def run_simulation(config: SimulationConfig) -> dict[str, Any]:
    time_points = np.linspace(config.t_start, config.t_end, config.points)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        sol = odeint(
            d_e_dt,
            config.e0,
            time_points,
            args=(config.alpha, config.beta, config.d_cap),
            full_output=True,
        )

    e_values = sol[0][:, 0]
    info = sol[1]

    c_values = e_values / (2.0 * e_values + 2.0)
    with np.errstate(divide="ignore", invalid="ignore"):
        t_values = np.divide(e_values, config.e0 * c_values)

    nan_mask = np.isnan(e_values)
    inf_mask = np.isinf(e_values)

    return {
        "t": time_points,
        "E": e_values,
        "c": c_values,
        "T": t_values,
        "nan_count": int(np.sum(nan_mask)),
        "inf_count": int(np.sum(inf_mask)),
        "integration_message": str(info.get("message", "")),
        "integration_warnings": [str(w.message) for w in caught],
        "laws_graph": build_laws_graph(),
        "quantum": run_quantum_probe(time_points, e_values),
    }


def print_summary(result: dict[str, Any]) -> None:
    t = result["t"]
    e = result["E"]
    c = result["c"]
    t_val = result["T"]

    print("Time points (first 5 and last 5):", t[:5], "...", t[-5:])
    print("E(t) (first 5 and last 5):", e[:5], "...", e[-5:])
    print("c(t) (first 5 and last 5):", c[:5], "...", c[-5:])
    print("T(t) (first 5 and last 5):", t_val[:5], "...", t_val[-5:])

    if result["nan_count"] > 0:
        print(f"Warning: NaN values detected in E: {result['nan_count']}")
    else:
        print("No NaNs detected in E.")

    if result["inf_count"] > 0:
        print(f"Warning: Inf values detected in E: {result['inf_count']}")

    integration_message = result["integration_message"].strip()
    if integration_message:
        print("Integrator status:", integration_message)

    if result["integration_warnings"]:
        print("Integrator warnings:")
        for warning_msg in result["integration_warnings"]:
            print("-", warning_msg)

    laws_graph = result["laws_graph"]
    if laws_graph["available"]:
        print(
            "Graph description:",
            f"{laws_graph['nodes']} nodes, {laws_graph['edges']} edges, density={laws_graph['density']:.6f}",
        )
    else:
        print("Graph description unavailable:", laws_graph["reason"])

    quantum = result["quantum"]
    if quantum["available"]:
        probs = quantum["probs"]
        print("Quantum state probs (first 5 and last 5):", probs[:5], "...", probs[-5:])
    else:
        print("Quantum probe unavailable:", quantum["reason"])


def export_csv(result: dict[str, Any], csv_out: str) -> Path:
    output_path = Path(csv_out)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    t = np.asarray(result["t"])
    e = np.asarray(result["E"])
    c = np.asarray(result["c"])
    t_val = np.asarray(result["T"])

    with output_path.open("w", newline="", encoding="utf-8") as file_handle:
        writer = csv.writer(file_handle)
        writer.writerow(["t", "E", "c", "T"])
        for idx in range(len(t)):
            writer.writerow([float(t[idx]), float(e[idx]), float(c[idx]), float(t_val[idx])])

    return output_path


def _to_float_list(values: np.ndarray) -> list[float]:
    return [float(v) for v in np.asarray(values)]


def export_json(result: dict[str, Any], json_out: str) -> Path:
    output_path = Path(json_out)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    quantum = result["quantum"]
    quantum_payload: dict[str, Any] = {
        "available": bool(quantum.get("available", False)),
    }
    if quantum_payload["available"]:
        quantum_payload["avg_e"] = float(quantum["avg_e"])
        quantum_payload["probs"] = [float(p) for p in quantum["probs"]]
    else:
        quantum_payload["reason"] = str(quantum.get("reason", "unavailable"))

    payload = {
        "summary": {
            "nan_count": int(result["nan_count"]),
            "inf_count": int(result["inf_count"]),
            "integration_message": str(result["integration_message"]),
            "integration_warnings": [str(w) for w in result["integration_warnings"]],
        },
        "laws_graph": result["laws_graph"],
        "quantum": quantum_payload,
        "timeseries": {
            "t": _to_float_list(result["t"]),
            "E": _to_float_list(result["E"]),
            "c": _to_float_list(result["c"]),
            "T": _to_float_list(result["T"]),
        },
    }

    with output_path.open("w", encoding="utf-8") as file_handle:
        json.dump(payload, file_handle, indent=2)

    return output_path


def parse_args() -> SimulationConfig:
    parser = argparse.ArgumentParser(description="Run the Omni quantum-cognitive toy simulation")
    parser.add_argument("--alpha", type=float, default=0.01)
    parser.add_argument("--beta", type=float, default=0.8)
    parser.add_argument("--e0", type=float, default=1.0)
    parser.add_argument("--t-start", type=float, default=0.0)
    parser.add_argument("--t-end", type=float, default=10.0)
    parser.add_argument("--points", type=int, default=100)
    parser.add_argument("--d-cap", type=float, default=1000.0)
    parser.add_argument("--csv-out", type=str, default=None)
    parser.add_argument("--json-out", type=str, default=None)
    args = parser.parse_args()

    return SimulationConfig(
        alpha=args.alpha,
        beta=args.beta,
        e0=args.e0,
        t_start=args.t_start,
        t_end=args.t_end,
        points=args.points,
        d_cap=args.d_cap,
        csv_out=args.csv_out,
        json_out=args.json_out,
    )


def main() -> None:
    config = parse_args()
    result = run_simulation(config)
    print_summary(result)
    if config.csv_out:
        csv_path = export_csv(result, config.csv_out)
        print("CSV export:", csv_path)
    if config.json_out:
        json_path = export_json(result, config.json_out)
        print("JSON export:", json_path)


if __name__ == "__main__":
    main()
