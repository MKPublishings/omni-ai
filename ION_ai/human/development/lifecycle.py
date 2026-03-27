from __future__ import annotations

from typing import Dict, Literal

from ..environment import Environment

LifeStage = Literal["child", "adolescent", "adult", "senior"]


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


def infer_life_stage(age_years: int) -> LifeStage:
    if age_years < 12:
        return "child"
    if age_years < 18:
        return "adolescent"
    if age_years < 60:
        return "adult"
    return "senior"


def progress_traits_over_time(
    traits: Dict[str, float],
    environment: Environment,
    years: int,
    current_stage: LifeStage,
) -> tuple[Dict[str, float], LifeStage]:
    if years <= 0:
        return dict(traits), current_stage

    stage_modifiers = {
        "child": 0.05,
        "adolescent": 0.08,
        "adult": 0.03,
        "senior": -0.04,
    }
    stage_shift = stage_modifiers[current_stage] * min(years, 20)

    evolved = dict(traits)
    for key, value in traits.items():
        influenced = environment.influence(key, value)
        evolved[key] = _clamp_unit((value * 0.7) + (influenced * 0.3) + stage_shift)

    return evolved, current_stage
