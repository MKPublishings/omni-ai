from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Forearm:
    name: str = "forearm"
    pronation: float = 0.0
    supination: float = 0.0

    def rotate(self, pronation: float, supination: float) -> "Forearm":
        self.pronation = pronation
        self.supination = supination
        return self
