from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Shin:
    name: str = "shin"
    tibial_load: float = 0.0
    fibular_load: float = 0.0

    def distribute_load(self, load: float) -> "Shin":
        self.tibial_load = load * 0.85
        self.fibular_load = load * 0.15
        return self
