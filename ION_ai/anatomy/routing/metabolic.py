from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass
class MetabolicRouter:
    distribution_efficiency: float

    def distribute(self, torso_energy_kcal: float, limb_weights: Mapping[str, float]) -> Mapping[str, float]:
        total_weight = sum(limb_weights.values())
        if total_weight <= 0.0:
            return {name: 0.0 for name in limb_weights}
        effective_energy = torso_energy_kcal * max(self.distribution_efficiency, 0.0)
        factor = effective_energy / total_weight
        return {name: weight * factor for name, weight in limb_weights.items()}
