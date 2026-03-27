from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from ION_ai.anatomy.spine import Spine

from .circulatory import CirculatoryRouter
from .fastpaths import fast_route
from .metabolic import MetabolicRouter
from .neural import NeuralRouter
from .state_router import StateRouter


@dataclass
class RoutingEngine:
    neural: NeuralRouter
    circulatory: CirculatoryRouter
    metabolic: MetabolicRouter
    state: StateRouter

    def fast_route(
        self,
        spine: Spine,
        head_state: Any,
        torso_state: Any,
        arm_state: Any,
        leg_state: Any,
        limb_demand_ml_min: float,
        limb_weights: Mapping[str, float],
        posture_angle_deg: float,
        spinal_load_newton: float,
        signal_strength: float,
    ) -> Mapping[str, Any]:
        return fast_route(
            spine=spine,
            neural_router=self.neural,
            circulatory_router=self.circulatory,
            metabolic_router=self.metabolic,
            state_router=self.state,
            head_state=head_state,
            torso_state=torso_state,
            arm_state=arm_state,
            leg_state=leg_state,
            limb_demand_ml_min=limb_demand_ml_min,
            limb_weights=limb_weights,
            posture_angle_deg=posture_angle_deg,
            spinal_load_newton=spinal_load_newton,
            signal_strength=signal_strength,
        )
