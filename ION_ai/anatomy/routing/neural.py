from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass
class NeuralRouter:
    conduction_velocity_m_s: float
    synaptic_delay_ms: float

    def route_signal(self, source: str, target: str, signal_strength: float) -> Dict[str, float | str]:
        velocity = max(self.conduction_velocity_m_s, 0.001)
        latency = self.synaptic_delay_ms + (1.0 / velocity)
        return {
            "source": source,
            "target": target,
            "signal_strength": signal_strength,
            "latency_ms": latency,
        }
