from __future__ import annotations

from typing import Mapping

from .state import OrganLoad, TorsoState
from .torso import Torso


def fast_torso_tick(
    torso: Torso,
    heart_rate_bpm: float,
    breaths_per_minute: float,
    effort_level: float,
    total_energy_kcal: float,
    glucose_level_mg_dl: float,
    lactate_level: float,
    organ_loads: Mapping[str, OrganLoad],
) -> TorsoState:
    return torso.snapshot_state(
        heart_rate_bpm=heart_rate_bpm,
        systolic_pressure=120.0,
        diastolic_pressure=80.0,
        breaths_per_minute=breaths_per_minute,
        effort_level=effort_level,
        total_energy_kcal=total_energy_kcal,
        glucose_level_mg_dl=glucose_level_mg_dl,
        lactate_level=lactate_level,
        organ_loads=organ_loads,
    )
