from __future__ import annotations

from typing import Any, Dict, List

from omni_ai.human.head.registry import HEAD_REGISTRY


def validate_graph(graph: Dict[str, List[Dict[str, str]]], registry: Dict[str, Any] | None = None) -> List[str]:
    active_registry = registry or HEAD_REGISTRY
    errors: List[str] = []
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    node_ids = {node.get("id", "") for node in nodes}

    for node in nodes:
        node_id = node.get("id", "")
        if not node_id:
            errors.append("Node missing required field: id")
            continue
        if node_id not in active_registry:
            errors.append(f"Unknown node id: {node_id}")

    for edge in edges:
        source = edge.get("source", "")
        target = edge.get("target", "")
        relation = edge.get("relation", "")

        if not source:
            errors.append("Edge missing required field: source")
        if not target:
            errors.append("Edge missing required field: target")
        if not relation:
            errors.append("Edge missing required field: relation")

        if source and source not in active_registry and source not in node_ids:
            errors.append(f"Unknown source: {source}")
        if target and target not in active_registry and target not in node_ids:
            errors.append(f"Unknown target: {target}")

    return errors
