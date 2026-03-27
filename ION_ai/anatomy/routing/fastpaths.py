from __future__ import annotations

from dataclasses import asdict
from typing import Any, Mapping

from ION_ai.anatomy.spine import Spine

from .circulatory import CirculatoryRouter
from .metabolic import MetabolicRouter
from .neural import NeuralRouter
from .state_router import StateRouter


def fast_route(
    spine: Spine,
    neural_router: NeuralRouter,
    circulatory_router: CirculatoryRouter,
    metabolic_router: MetabolicRouter,
    state_router: StateRouter,
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
    spine_state = spine.snapshot(posture_angle_deg=posture_angle_deg, load_newton=spinal_load_newton)

    neural = neural_router.route_signal(source="head", target="limbs", signal_strength=signal_strength)
    spinal_neural = spine.spinal_cord.route_head_to_limb(signal_strength)
    reflex = spine.spinal_cord.reflex_arc(signal_strength)

    arterial, venous = circulatory_router.route_flow(
        torso_flow_l_min=torso_state.circulatory.heart_rate_bpm * 0.01,
        limb_demand_ml_min=limb_demand_ml_min,
    )
    distributed_flow = spine.coupling.distribute_flow(arterial)

    metabolic = metabolic_router.distribute(
        torso_energy_kcal=torso_state.metabolic.total_energy_kcal,
        limb_weights=limb_weights,
    )

    merged = state_router.merge(
        head_state=head_state,
        torso_state=torso_state,
        arm_state=arm_state,
        leg_state=leg_state,
        spine_state=spine_state,
    )

    return {
        "spine": asdict(spine_state),
        "neural": {
            "router": neural,
            "spinal": spinal_neural,
            "distributed": spine.coupling.distribute_neural(signal_strength),
        },
        "reflex": reflex,
        "circulatory": {
            "arterial": arterial,
            "venous": venous,
            "distributed": distributed_flow,
        },
        "metabolic": metabolic,
        "state": merged,
    }
