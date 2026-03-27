from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass(frozen=True)
class OrganLoadModel:
    oxygen_demand: float
    nutrient_demand: float
    waste_level: float


@dataclass(frozen=True)
class TorsoRequest:
    heart_rate_bpm: float
    breaths_per_minute: float
    effort_level: float
    total_energy_kcal: float
    glucose_level_mg_dl: float
    lactate_level: float
    organ_loads: Mapping[str, OrganLoadModel]
