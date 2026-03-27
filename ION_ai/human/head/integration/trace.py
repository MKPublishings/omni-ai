from __future__ import annotations

from typing import Any, Dict, List

from ION_ai.human.neck.registry import NECK_REGISTRY

from ION_ai.human.head.registry import HEAD_REGISTRY


def _contains(values: Any, target: str) -> bool:
    if isinstance(values, (list, tuple, set)):
        return target in values
    return False


def trace_structure(
    structure_id: str,
    registry: Dict[str, Any] | None = None,
    include_neck: bool = True,
) -> List[Dict[str, str]]:
    active_registry = registry or build_trace_registry(include_neck=include_neck)
    connections: List[Dict[str, str]] = []
    for key, value in active_registry.items():
        if isinstance(value, dict):
            continue

        if hasattr(value, "connections") and _contains(getattr(value, "connections"), structure_id):
            connections.append({"from": key, "to": structure_id, "relation": "connected"})
        if hasattr(value, "targets") and _contains(getattr(value, "targets"), structure_id):
            connections.append({"from": key, "to": structure_id, "relation": "innervates"})
        if hasattr(value, "territory") and _contains(getattr(value, "territory"), structure_id):
            connections.append({"from": key, "to": structure_id, "relation": "supplies"})
        if hasattr(value, "articulations") and _contains(getattr(value, "articulations"), structure_id):
            connections.append({"from": key, "to": structure_id, "relation": "articulates_with"})
        if hasattr(value, "output_path") and _contains(getattr(value, "output_path"), structure_id):
            connections.append({"from": key, "to": structure_id, "relation": "sensory_pathway"})
        if hasattr(value, "innervation") and (
            _contains(getattr(value, "innervation"), _nerve_number(structure_id))
            or _contains(getattr(value, "innervation"), structure_id)
        ):
            connections.append({"from": key, "to": structure_id, "relation": "innervated_by"})

    return connections


def _nerve_number(structure_id: str) -> int:
    if structure_id.startswith("cranial_nerve_"):
        tail = structure_id.removeprefix("cranial_nerve_")
        return int(tail) if tail.isdigit() else -1
    if structure_id.isdigit():
        return int(structure_id)
    alias_map = {
        "olfactory_nerve": 1,
        "optic_nerve": 2,
        "oculomotor_nerve": 3,
        "trochlear_nerve": 4,
        "trigeminal_nerve": 5,
        "abducens_nerve": 6,
        "facial_nerve": 7,
        "vestibulocochlear_nerve": 8,
        "glossopharyngeal_nerve": 9,
        "vagus_nerve": 10,
        "accessory_nerve": 11,
        "hypoglossal_nerve": 12,
    }
    if structure_id in alias_map:
        return alias_map[structure_id]
    return -1


def build_trace_registry(include_neck: bool = True) -> Dict[str, Any]:
    registry = dict(HEAD_REGISTRY)
    if include_neck:
        registry.update(NECK_REGISTRY)
    return registry
