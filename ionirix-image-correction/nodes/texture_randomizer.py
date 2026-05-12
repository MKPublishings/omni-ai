from __future__ import annotations

import random
from typing import Iterable


def jitter_roughness(material_map: Iterable[float], jitter: float = 0.2, seed: int | None = None) -> list[float]:
    jitter = abs(float(jitter))
    rng = random.Random(seed)
    output: list[float] = []
    for value in material_map:
        factor = 1.0 + rng.uniform(-jitter, jitter)
        output.append(max(0.0, float(value) * factor))
    return output
