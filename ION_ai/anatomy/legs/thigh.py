from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Thigh:
    name: str = "thigh"
    length_cm: float = 45.0
    muscle_mass: float = 2.5

    def contract(self, intensity: float) -> dict[str, float]:
        normalized_intensity = max(0.0, min(1.0, intensity))
        return {"force_output_newton": normalized_intensity * self.muscle_mass * 180.0}
