from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple


@dataclass
class CirculatoryRouter:
    arterial_resistance: float
    venous_resistance: float

    def route_flow(self, torso_flow_l_min: float, limb_demand_ml_min: float) -> Tuple[float, float]:
        arterial_multiplier = 1.0 - min(max(self.arterial_resistance, 0.0), 1.0)
        venous_multiplier = 1.0 - min(max(self.venous_resistance, 0.0), 1.0)
        arterial_flow = torso_flow_l_min * arterial_multiplier
        venous_return = limb_demand_ml_min * venous_multiplier
        return arterial_flow, venous_return
