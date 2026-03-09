from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass(frozen=True)
class OrganLoad:
    oxygen_demand: float
    nutrient_demand: float
    waste_level: float


@dataclass(frozen=True)
class CirculatoryState:
    heart_rate_bpm: float
    systolic_pressure: float
    diastolic_pressure: float
    blood_oxygen_saturation: float


@dataclass(frozen=True)
class RespiratoryState:
    breaths_per_minute: float
    tidal_volume_ml: float
    oxygen_intake_rate: float
    co2_expulsion_rate: float


@dataclass(frozen=True)
class MetabolicState:
    total_energy_kcal: float
    glucose_level_mg_dl: float
    lactate_level: float
    organ_loads: Mapping[str, OrganLoad]


@dataclass(frozen=True)
class TorsoState:
    circulatory: CirculatoryState
    respiratory: RespiratoryState
    metabolic: MetabolicState
