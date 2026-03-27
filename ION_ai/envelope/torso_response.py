from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .torso_request import OrganLoadModel


@dataclass(frozen=True)
class CirculatoryOut:
    heart_rate_bpm: float
    systolic_pressure: float
    diastolic_pressure: float
    blood_oxygen_saturation: float


@dataclass(frozen=True)
class RespiratoryOut:
    breaths_per_minute: float
    tidal_volume_ml: float
    oxygen_intake_rate: float
    co2_expulsion_rate: float


@dataclass(frozen=True)
class MetabolicOut:
    total_energy_kcal: float
    glucose_level_mg_dl: float
    lactate_level: float
    organ_loads: Mapping[str, OrganLoadModel]


@dataclass(frozen=True)
class TorsoResponse:
    circulatory: CirculatoryOut
    respiratory: RespiratoryOut
    metabolic: MetabolicOut
