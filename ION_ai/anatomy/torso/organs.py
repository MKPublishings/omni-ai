from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Heart:
    max_cardiac_output_l_min: float
    resting_heart_rate_bpm: float
    stroke_volume_ml: float

    def compute_output_l_min(self, heart_rate_bpm: float) -> float:
        output = (heart_rate_bpm * self.stroke_volume_ml) / 1000.0
        return min(output, self.max_cardiac_output_l_min)


@dataclass
class Lungs:
    vital_capacity_l: float
    resting_tidal_volume_ml: float
    max_ventilation_l_min: float

    def compute_oxygen_uptake(self, breaths_per_minute: float, tidal_volume_ml: float) -> float:
        minute_ventilation_l = (breaths_per_minute * tidal_volume_ml) / 1000.0
        clamped_ventilation = min(minute_ventilation_l, self.max_ventilation_l_min)
        return clamped_ventilation * 0.25


@dataclass
class Liver:
    max_detox_rate: float
    glycogen_capacity_kcal: float


@dataclass
class Stomach:
    max_volume_ml: float
    emptying_rate_ml_min: float


@dataclass
class Intestines:
    absorption_rate_kcal_min: float


@dataclass
class Kidneys:
    filtration_rate_ml_min: float


@dataclass
class Spleen:
    blood_reservoir_ml: float
