from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SpinalState:
    posture_angle_deg: float
    load_newton: float
    tension_index: float
    routing_latency_ms: float
