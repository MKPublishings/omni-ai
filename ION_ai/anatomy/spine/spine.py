from __future__ import annotations

from dataclasses import dataclass

from .coupling import SpinalCoupling
from .spinal_cord import SpinalCord
from .state import SpinalState
from .vertebrae import Vertebrae


@dataclass
class Spine:
    vertebrae: Vertebrae
    spinal_cord: SpinalCord
    coupling: SpinalCoupling

    def snapshot(self, posture_angle_deg: float, load_newton: float) -> SpinalState:
        capacity = max(self.vertebrae.load_capacity_newton, 0.001)
        routing_latency = (1.0 / max(self.spinal_cord.conduction_velocity_m_s, 0.001)) + self.spinal_cord.reflex_latency_ms
        tension = load_newton / capacity
        return SpinalState(
            posture_angle_deg=posture_angle_deg,
            load_newton=load_newton,
            tension_index=tension,
            routing_latency_ms=routing_latency,
        )
