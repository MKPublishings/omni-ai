from __future__ import annotations

from typing import Iterable


def gaussian_blur_1d(values: list[float], radius: int) -> list[float]:
    if radius <= 0 or len(values) <= 2:
        return values[:]
    kernel_size = 2 * radius + 1
    weight = 1.0 / kernel_size
    result: list[float] = []
    for index in range(len(values)):
        accum = 0.0
        for sample in range(index - radius, index + radius + 1):
            clamped = min(max(sample, 0), len(values) - 1)
            accum += values[clamped] * weight
        result.append(accum)
    return result


def soften(shadow_map: Iterable[float], radius: float = 0.6) -> list[float]:
    values = [max(0.0, min(1.0, float(v))) for v in shadow_map]
    pixel_radius = max(0, int(round(radius * 3)))
    return gaussian_blur_1d(values, pixel_radius)
