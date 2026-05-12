from __future__ import annotations

from typing import Iterable

_ALLOWED_REGIONS = {"face", "neck", "shoulders", "torso", "hands"}


def refine(mask: dict[str, float], regions: Iterable[str]) -> dict[str, float]:
    requested = [region for region in regions if region in _ALLOWED_REGIONS]
    refined: dict[str, float] = {}
    for region in requested:
        refined[region] = max(0.0, min(1.0, float(mask.get(region, 0.0))))
    return refined


def segment_body(image_features: dict[str, float]) -> dict[str, float]:
    # Placeholder for SAM/BodyPix integration.
    return refine(image_features, regions=["face", "neck", "shoulders"])
