from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass
class SpinalCord:
    conduction_velocity_m_s: float
    reflex_latency_ms: float

    def route_head_to_limb(self, signal_strength: float) -> Dict[str, float]:
        velocity = max(self.conduction_velocity_m_s, 0.001)
        latency = 1.0 / velocity
        return {"signal_strength": signal_strength, "latency_ms": latency}

    def reflex_arc(self, limb_signal: float) -> Dict[str, float]:
        return {"reflex_strength": limb_signal, "latency_ms": self.reflex_latency_ms}
