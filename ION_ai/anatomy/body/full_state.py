from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class FullBodyState:
    head: Any
    torso: Any
    arms: Any
    legs: Any
    spine: Any
    routing: Mapping[str, Any]
