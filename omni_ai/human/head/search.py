from __future__ import annotations

from typing import Any, Dict, List

from omni_ai.human.head.integration.search import search_head as _integration_search_head


def search_head(query: str, registry: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
    # Compatibility wrapper; registry argument is ignored.
    return _integration_search_head(query)


def _name_for(value: Any, fallback: str) -> str:
    # Legacy helper kept to avoid breaking external imports.
    if hasattr(value, "name"):
        return str(getattr(value, "name"))
    if isinstance(value, dict):
        return str(value.get("name", fallback))
    return fallback
