from __future__ import annotations

from dataclasses import dataclass


@dataclass
class AbdominalWall:
    strength_index: float
    endurance_index: float


@dataclass
class BackMuscles:
    strength_index: float
    posture_support_index: float


@dataclass
class Diaphragm:
    contraction_force_index: float

    def compute_tidal_volume_ml(self, effort_level: float) -> float:
        # Keep effort bounded so a malformed request does not produce wild outputs.
        clamped_effort = min(max(effort_level, 0.0), 1.5)
        return self.contraction_force_index * clamped_effort
