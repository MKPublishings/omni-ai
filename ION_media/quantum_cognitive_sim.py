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
    mode: str = "single"
    alpha: float = 0.01
    beta: float = 0.8
    e0: float = 1.0
    t_start: float = 0.0
    t_end: float = 10.0
    points: int = 100
    d_cap: float = 1000.0
    levels: int = 20
    num_cols: int = 3
    gamma: float = 0.1
    w_zpf: float = 7.8e12 * 2.0 * np.pi
    w_glu_ratio: float = 1.0
    g_ratio: float = 0.01
    coupling_ratio: float = 0.005
    ntraj: int = 32
    laws_nodes: int = 103
    laws_attach: int = 2
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


def build_scale_free_laws_graph(nodes: int, attach: int) -> dict[str, Any]:
    if nx is None:
        return {"available": False, "reason": "networkx not installed"}

    safe_nodes = max(3, int(nodes))
    safe_attach = max(1, min(int(attach), safe_nodes - 1))
    graph = nx.barabasi_albert_graph(safe_nodes, safe_attach)
    avg_degree = float(np.mean([deg for _, deg in graph.degree()]))
    return {
        "available": True,
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "density": float(nx.density(graph)),
        "avg_degree": avg_degree,
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


def _tensor_operator(osc_ops: list[Any], qubit_ops: list[Any]) -> Any:
    return qt.tensor(*(osc_ops + qubit_ops))


def run_quantum_avalanche(config: SimulationConfig) -> dict[str, Any]:
    if qt is None:
        return {"available": False, "reason": "qutip not installed"}

    levels = max(2, int(config.levels))
    num_cols = max(1, int(config.num_cols))
    w_zpf = float(config.w_zpf)
    w_glu = float(config.w_glu_ratio) * w_zpf
    g = float(config.g_ratio) * w_zpf
    coupling = float(config.coupling_ratio) * w_zpf

    a = qt.destroy(levels)
    eye_osc = qt.qeye(levels)
    eye_q = qt.qeye(2)
    sigmax = qt.sigmax()
    sigmaz = qt.sigmaz()

    hamiltonian = 0
    for col in range(num_cols):
        osc_factors = [eye_osc for _ in range(num_cols)]
        qubit_factors = [eye_q for _ in range(num_cols)]

        osc_factors[col] = a.dag() * a
        h_zpf = w_zpf * _tensor_operator(osc_factors, qubit_factors)

        osc_factors = [eye_osc for _ in range(num_cols)]
        qubit_factors = [eye_q for _ in range(num_cols)]
        qubit_factors[col] = sigmaz
        h_glu = 0.5 * w_glu * _tensor_operator(osc_factors, qubit_factors)

        osc_factors = [eye_osc for _ in range(num_cols)]
        qubit_factors = [eye_q for _ in range(num_cols)]
        osc_factors[col] = a + a.dag()
        qubit_factors[col] = sigmax
        h_int = g * _tensor_operator(osc_factors, qubit_factors)

        hamiltonian = hamiltonian + h_zpf + h_glu + h_int

    for left in range(num_cols - 1):
        right = left + 1
        osc_factors = [eye_osc for _ in range(num_cols)]
        qubit_factors = [eye_q for _ in range(num_cols)]
        osc_factors[left] = a + a.dag()
        qubit_factors[right] = sigmax
        hamiltonian = hamiltonian + coupling * _tensor_operator(osc_factors, qubit_factors)

    initial_parts = [qt.basis(levels, 0) for _ in range(num_cols)]
    plus = (qt.basis(2, 0) + qt.basis(2, 1)).unit()
    initial_parts.extend([plus for _ in range(num_cols)])
    psi0 = qt.tensor(*initial_parts)

    time_points = np.linspace(config.t_start, config.t_end, config.points)

    collapse_ops: list[Any] = []
    gamma = max(0.0, float(config.gamma))
    if gamma > 0.0:
        for col in range(num_cols):
            osc_factors = [eye_osc for _ in range(num_cols)]
            qubit_factors = [eye_q for _ in range(num_cols)]
            osc_factors[col] = a
            collapse_ops.append(np.sqrt(gamma) * _tensor_operator(osc_factors, qubit_factors))

    zpf_avg = 0
    glutamate_exc_avg = 0
    glutamate_coh_avg = 0
    for col in range(num_cols):
        osc_factors = [eye_osc for _ in range(num_cols)]
        qubit_factors = [eye_q for _ in range(num_cols)]
        osc_factors[col] = a.dag() * a
        zpf_avg = zpf_avg + _tensor_operator(osc_factors, qubit_factors)

        osc_factors = [eye_osc for _ in range(num_cols)]
        qubit_factors = [eye_q for _ in range(num_cols)]
        qubit_factors[col] = sigmaz
        glutamate_exc_avg = glutamate_exc_avg + _tensor_operator(osc_factors, qubit_factors)

        osc_factors = [eye_osc for _ in range(num_cols)]
        qubit_factors = [eye_q for _ in range(num_cols)]
        qubit_factors[col] = sigmax
        glutamate_coh_avg = glutamate_coh_avg + _tensor_operator(osc_factors, qubit_factors)

    norm = float(num_cols)
    e_ops = [zpf_avg / norm, glutamate_exc_avg / norm, glutamate_coh_avg / norm]
    solver = "mesolve"
    if collapse_ops:
        try:
            result = qt.mesolve(hamiltonian, psi0, time_points, c_ops=collapse_ops, e_ops=e_ops)
        except OverflowError:
            solver = "mcsolve"
            result = qt.mcsolve(
                hamiltonian,
                psi0,
                time_points,
                c_ops=collapse_ops,
                e_ops=e_ops,
                ntraj=max(1, int(config.ntraj)),
            )
    else:
        solver = "sesolve"
        result = qt.sesolve(hamiltonian, psi0, time_points, e_ops=e_ops)

    return {
        "available": True,
        "mode": "avalanche",
        "t": [float(v) for v in time_points],
        "avg_zpf": [float(v) for v in result.expect[0]],
        "avg_glutamate_exc": [float(v) for v in result.expect[1]],
        "avg_glutamate_coh": [float(v) for v in result.expect[2]],
        "params": {
            "levels": levels,
            "num_cols": num_cols,
            "gamma": gamma,
            "solver": solver,
            "ntraj": max(1, int(config.ntraj)),
            "w_zpf": w_zpf,
            "w_glu": w_glu,
            "g": g,
            "coupling": coupling,
        },
        "laws_graph": build_scale_free_laws_graph(config.laws_nodes, config.laws_attach),
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

    result: dict[str, Any] = {
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
    if config.mode == "avalanche":
        result["quantum"] = run_quantum_avalanche(config)
    return result


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
        if quantum.get("mode") == "avalanche":
            avg_zpf = quantum["avg_zpf"]
            avg_exc = quantum["avg_glutamate_exc"]
            avg_coh = quantum["avg_glutamate_coh"]
            print("Avalanche avg ZPF n (first 5 and last 5):", avg_zpf[:5], "...", avg_zpf[-5:])
            print(
                "Avalanche avg glutamate sigma_z (first 5 and last 5):",
                avg_exc[:5],
                "...",
                avg_exc[-5:],
            )
            print(
                "Avalanche avg glutamate coherence sigma_x (first 5 and last 5):",
                avg_coh[:5],
                "...",
                avg_coh[-5:],
            )
            print(
                "Avalanche solver:",
                quantum["params"].get("solver", "unknown"),
                "(ntraj=",
                quantum["params"].get("ntraj", "n/a"),
                ")",
            )
            avalanche_graph = quantum["laws_graph"]
            if avalanche_graph["available"]:
                print(
                    "Avalanche graph:",
                    f"{avalanche_graph['nodes']} nodes, {avalanche_graph['edges']} edges, "
                    f"density={avalanche_graph['density']:.6f}, avg_degree={avalanche_graph['avg_degree']:.3f}",
                )
            else:
                print("Avalanche graph unavailable:", avalanche_graph["reason"])
        else:
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
        if quantum.get("mode") == "avalanche":
            quantum_payload["mode"] = "avalanche"
            quantum_payload["params"] = {
                "levels": int(quantum["params"]["levels"]),
                "num_cols": int(quantum["params"]["num_cols"]),
                "gamma": float(quantum["params"]["gamma"]),
                "solver": str(quantum["params"]["solver"]),
                "ntraj": int(quantum["params"]["ntraj"]),
                "w_zpf": float(quantum["params"]["w_zpf"]),
                "w_glu": float(quantum["params"]["w_glu"]),
                "g": float(quantum["params"]["g"]),
                "coupling": float(quantum["params"]["coupling"]),
            }
            quantum_payload["t"] = [float(v) for v in quantum["t"]]
            quantum_payload["avg_zpf"] = [float(v) for v in quantum["avg_zpf"]]
            quantum_payload["avg_glutamate_exc"] = [float(v) for v in quantum["avg_glutamate_exc"]]
            quantum_payload["avg_glutamate_coh"] = [float(v) for v in quantum["avg_glutamate_coh"]]
            quantum_payload["laws_graph"] = quantum["laws_graph"]
        else:
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
    parser = argparse.ArgumentParser(description="Run the ION quantum-cognitive toy simulation")
    parser.add_argument("--mode", type=str, choices=("single", "avalanche"), default="single")
    parser.add_argument("--alpha", type=float, default=0.01)
    parser.add_argument("--beta", type=float, default=0.8)
    parser.add_argument("--e0", type=float, default=1.0)
    parser.add_argument("--t-start", type=float, default=0.0)
    parser.add_argument("--t-end", type=float, default=10.0)
    parser.add_argument("--points", type=int, default=100)
    parser.add_argument("--d-cap", type=float, default=1000.0)
    parser.add_argument("--levels", type=int, default=20)
    parser.add_argument("--num-cols", type=int, default=3)
    parser.add_argument("--gamma", type=float, default=0.1)
    parser.add_argument("--w-zpf", type=float, default=7.8e12 * 2.0 * np.pi)
    parser.add_argument("--w-glu-ratio", type=float, default=1.0)
    parser.add_argument("--g-ratio", type=float, default=0.01)
    parser.add_argument("--coupling-ratio", type=float, default=0.005)
    parser.add_argument("--ntraj", type=int, default=32)
    parser.add_argument("--laws-nodes", type=int, default=103)
    parser.add_argument("--laws-attach", type=int, default=2)
    parser.add_argument("--csv-out", type=str, default=None)
    parser.add_argument("--json-out", type=str, default=None)
    args = parser.parse_args()

    return SimulationConfig(
        mode=args.mode,
        alpha=args.alpha,
        beta=args.beta,
        e0=args.e0,
        t_start=args.t_start,
        t_end=args.t_end,
        points=args.points,
        d_cap=args.d_cap,
        levels=args.levels,
        num_cols=args.num_cols,
        gamma=args.gamma,
        w_zpf=args.w_zpf,
        w_glu_ratio=args.w_glu_ratio,
        g_ratio=args.g_ratio,
        coupling_ratio=args.coupling_ratio,
        ntraj=args.ntraj,
        laws_nodes=args.laws_nodes,
        laws_attach=args.laws_attach,
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
