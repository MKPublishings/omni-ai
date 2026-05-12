from __future__ import annotations

from typing import Sequence


def normalize(depth_values: Sequence[float]) -> list[float]:
    if not depth_values:
        return []
    min_v = min(depth_values)
    max_v = max(depth_values)
    if max_v == min_v:
        return [0.0 for _ in depth_values]
    scale = max_v - min_v
    return [(value - min_v) / scale for value in depth_values]


def estimate_depth(image_luma: Sequence[float]) -> list[float]:
    # Placeholder for MiDaS/ZoeDepth integration.
    return normalize(image_luma)
