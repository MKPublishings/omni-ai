from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from omni_ai.anatomy.routing import RoutingEngine
from omni_ai.anatomy.spine import Spine

from .full_state import FullBodyState
from .limb_contracts import BodyLimbRequest, BodyLimbState


@dataclass
class Body:
    envelope_registry: Any
    routing: RoutingEngine
    spine: Spine

    @staticmethod
    def _normalize_limb_request(request: Any) -> Any:
        if isinstance(request, BodyLimbRequest):
            return request.as_mapping()
        return request

    @staticmethod
    def _extract_force_output(limb_state: Any) -> float:
        if isinstance(limb_state, Mapping):
            return float(limb_state.get("force_output_newton", 0.0))
        if hasattr(limb_state, "force_output_newton"):
            return float(getattr(limb_state, "force_output_newton"))
        return 0.0

    @staticmethod
    def _normalize_limb_state(limb_state: Any) -> Any:
        if isinstance(limb_state, Mapping) and "left" in limb_state and "right" in limb_state:
            return BodyLimbState(
                left=limb_state["left"],
                right=limb_state["right"],
                force_output_newton=float(limb_state.get("force_output_newton", 0.0)),
            )
        if isinstance(limb_state, Mapping) and "state" in limb_state and isinstance(limb_state["state"], Mapping):
            nested_state = limb_state["state"]
            if "left" in nested_state and "right" in nested_state:
                return BodyLimbState(
                    left=nested_state["left"],
                    right=nested_state["right"],
                    force_output_newton=float(limb_state.get("force_output_newton", 0.0)),
                )
        return limb_state

    def tick(
        self,
        head_request: Any,
        torso_request: Any,
        arm_request: BodyLimbRequest | Any,
        leg_request: BodyLimbRequest | Any,
        posture_angle_deg: float,
        spinal_load_newton: float,
        signal_strength: float,
        limb_weights: Mapping[str, float] | None = None,
    ) -> FullBodyState:
        normalized_arm_request = self._normalize_limb_request(arm_request)
        normalized_leg_request = self._normalize_limb_request(leg_request)

        head_state = self.envelope_registry.get("head")(head_request)
        torso_state = self.envelope_registry.get("torso")(torso_request)
        arm_state = self.envelope_registry.get("arms")(normalized_arm_request)
        leg_state = self.envelope_registry.get("legs")(normalized_leg_request)

        limb_demand_ml_min = self._extract_force_output(arm_state) + self._extract_force_output(leg_state)

        normalized_arm_state = self._normalize_limb_state(arm_state)
        normalized_leg_state = self._normalize_limb_state(leg_state)

        routing_result = self.routing.fast_route(
            spine=self.spine,
            head_state=head_state,
            torso_state=torso_state,
            arm_state=normalized_arm_state,
            leg_state=normalized_leg_state,
            limb_demand_ml_min=limb_demand_ml_min,
            limb_weights=limb_weights or {"arms": 1.0, "legs": 2.0},
            posture_angle_deg=posture_angle_deg,
            spinal_load_newton=spinal_load_newton,
            signal_strength=signal_strength,
        )

        return FullBodyState(
            head=head_state,
            torso=torso_state,
            arms=normalized_arm_state,
            legs=normalized_leg_state,
            spine=routing_result["spine"],
            routing=routing_result,
        )
