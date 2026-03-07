from __future__ import annotations

import os
import sys
from typing import Any, Dict

# Allow direct execution via `python examples/human_head.py`.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from omni_ai.human.head import handle_head_request
from omni_ai.human.head.envelopes import HeadRequest


def call(subsystem: str, operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    request = HeadRequest(
        system="human_head",
        subsystem=subsystem,
        operation=operation,
        payload=payload,
    )
    response = handle_head_request(request)
    return {
        "status": response.status,
        "error": response.error,
        "result": response.result,
    }


def print_section(title: str) -> None:
    print(f"\n=== {title} ===")


def print_function_summary(function_name: str) -> None:
    response = call("integration", "explain_function", {"name": function_name})
    graph = response.get("result", {}).get("graph", {})
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    print(
        {
            "status": response.get("status"),
            "name": response.get("result", {}).get("name"),
            "node_count": len(nodes),
            "edge_count": len(edges),
        }
    )


def main() -> None:
    print_section("Vascular: Supply Map")
    supply = call("vascular", "supply_map", {"territory": "brainstem"})
    print(supply)

    print_section("Glands: Salivary List")
    glands = call("glands", "list_glands", {"gland_type": "salivary"})
    print(glands)

    print_section("Integration: Functional Graphs")
    function_names = [
        "smile",
        "chew",
        "speak",
        "blink",
        "swallow",
        "look_left",
        "look_right",
        "look_up",
        "look_down",
        "raise_eyebrows",
        "frown",
    ]
    for function_name in function_names:
        print_function_summary(function_name)


if __name__ == "__main__":
    main()
