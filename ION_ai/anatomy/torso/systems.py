from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .organs import Heart, Lungs


@dataclass
class CirculatorySystem:
    heart: Heart
    blood_volume_l: float

    def simulate_cardiac_cycle(self, heart_rate_bpm: float) -> float:
        return self.heart.compute_output_l_min(heart_rate_bpm)


@dataclass
class RespiratorySystem:
    lungs: Lungs

    def simulate_breathing(self, breaths_per_minute: float, tidal_volume_ml: float) -> float:
        return self.lungs.compute_oxygen_uptake(breaths_per_minute, tidal_volume_ml)


@dataclass
class MetabolicSystem:
    basal_metabolic_rate_kcal_day: float
    organ_weights: Mapping[str, float]

    def distribute_energy(self, total_energy_kcal: float) -> Mapping[str, float]:
        total_weight = sum(self.organ_weights.values())
        if total_weight <= 0.0:
            return {name: 0.0 for name in self.organ_weights}
        factor = total_energy_kcal / total_weight
        return {name: weight * factor for name, weight in self.organ_weights.items()}
