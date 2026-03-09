from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class BodyLimbRequest:
    left: Mapping[str, Any]
    right: Mapping[str, Any]

    def as_mapping(self) -> dict[str, Mapping[str, Any]]:
        return {
            "left": dict(self.left),
            "right": dict(self.right),
        }


@dataclass(frozen=True)
class BodyLimbState:
    left: Any
    right: Any
    force_output_newton: float
