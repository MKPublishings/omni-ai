from __future__ import annotations

from typing import Any, Dict, Iterable, Mapping


def as_id(civilization: Any) -> str:
    if isinstance(civilization, Mapping):
        value = civilization.get("id")
    else:
        value = getattr(civilization, "id", None)
    return str(value or "unknown")


def as_name(civilization: Any) -> str:
    if isinstance(civilization, Mapping):
        value = civilization.get("name")
    else:
        value = getattr(civilization, "name", None)
    return str(value or as_id(civilization))


def get_nested(source: Any, path: str, default: float = 0.0) -> float:
    current: Any = source
    for part in path.split("."):
        if isinstance(current, Mapping):
            current = current.get(part)
        else:
            current = getattr(current, part, None)
        if current is None:
            return default
    try:
        return float(current)
    except (TypeError, ValueError):
        return default


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def average(values: Iterable[float], fallback: float = 0.0) -> float:
    values_list = list(values)
    if not values_list:
        return fallback
    return sum(values_list) / len(values_list)


def relation_lookup(source: Any, target_id: str) -> Dict[str, float]:
    if isinstance(source, Mapping):
        relations = source.get("relations", {})
    else:
        relations = getattr(source, "relations", {})

    if not isinstance(relations, Mapping):
        return {}

    relation = relations.get(target_id, {})
    if not isinstance(relation, Mapping):
        return {}
    return {key: float(value) for key, value in relation.items() if isinstance(value, (int, float))}
