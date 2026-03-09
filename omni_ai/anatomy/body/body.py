from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from omni_ai.anatomy.routing import RoutingEngine
from omni_ai.anatomy.spine import Spine

from .full_state import FullBodyState


@dataclass
class Body:
    envelope_registry: Any
    routing: RoutingEngine
    spine: Spine

    def tick(
        self,
        head_request: Any,
        torso_request: Any,
        arm_request: Any,
        leg_request: Any,
        posture_angle_deg: float,
        spinal_load_newton: float,
        signal_strength: float,
        limb_weights: Mapping[str, float] | None = None,
    ) -> FullBodyState:
        head_state = self.envelope_registry.get("head")(head_request)
        torso_state = self.envelope_registry.get("torso")(torso_request)
        arm_state = self.envelope_registry.get("arms")(arm_request)
        leg_state = self.envelope_registry.get("legs")(leg_request)

        limb_demand_ml_min = float(arm_state.get("force_output_newton", 0.0)) + float(
            leg_state.get("force_output_newton", 0.0)
        )

        routing_result = self.routing.fast_route(
            spine=self.spine,
            head_state=head_state,
            torso_state=torso_state,
            arm_state=arm_state,
            leg_state=leg_state,
            limb_demand_ml_min=limb_demand_ml_min,
            limb_weights=limb_weights or {"arms": 1.0, "legs": 2.0},
            posture_angle_deg=posture_angle_deg,
            spinal_load_newton=spinal_load_newton,
            signal_strength=signal_strength,
        )

        return FullBodyState(
            head=head_state,
            torso=torso_state,
            arms=arm_state,
            legs=leg_state,
            spine=routing_result["spine"],
            routing=routing_result,
        )
