from __future__ import annotations

from dataclasses import dataclass


@dataclass
class UpperArm:
    name: str = "upper_arm"
    length_cm: float = 30.0
    muscle_mass: float = 1.0

    def contract(self, intensity: float) -> dict[str, float]:
        normalized_intensity = max(0.0, min(1.0, intensity))
        return {"force_output_newton": normalized_intensity * self.muscle_mass * 120.0}
