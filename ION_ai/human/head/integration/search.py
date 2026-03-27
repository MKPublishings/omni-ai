from __future__ import annotations

from typing import Any, Dict, List

from omni_ai.human.head.registry import HEAD_REGISTRY


def search_head(query: str) -> List[Dict[str, Any]]:
    q = query.lower().strip()
    if not q:
        return []

    results: List[Dict[str, Any]] = []
    for key, value in HEAD_REGISTRY.items():
        if isinstance(value, dict):
            name = str(value.get("name", key))
            value_type = str(value.get("type", "Object"))
        else:
            name = str(getattr(value, "name", key))
            value_type = value.__class__.__name__

        if q in key.lower() or q in name.lower():
            results.append({"id": key, "name": name, "type": value_type})

    return results
