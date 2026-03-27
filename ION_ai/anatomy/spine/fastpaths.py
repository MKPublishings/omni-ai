from __future__ import annotations

from typing import Dict

from .spine import Spine


def fast_spine_tick(
    spine: Spine,
    posture_angle_deg: float,
    load_newton: float,
    signal_strength: float,
) -> Dict[str, object]:
    state = spine.snapshot(posture_angle_deg=posture_angle_deg, load_newton=load_newton)
    neural = spine.spinal_cord.route_head_to_limb(signal_strength)
    reflex = spine.spinal_cord.reflex_arc(signal_strength)
    return {"state": state, "neural": neural, "reflex": reflex}
