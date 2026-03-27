from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Ankle:
    name: str = "ankle"
    dorsiflexion: float = 0.0
    plantarflexion: float = 0.0
    inversion: float = 0.0
    eversion: float = 0.0

    def articulate(self, **kwargs: float) -> "Ankle":
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        return self
