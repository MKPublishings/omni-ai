from __future__ import annotations

from typing import Iterable


def apply_fog(depth_map: Iterable[float], density: float = 0.15) -> list[float]:
    density = max(0.0, min(1.0, float(density)))
    output: list[float] = []
    for depth in depth_map:
        clamped = max(0.0, min(1.0, float(depth)))
        output.append(clamped * density)
    return output
