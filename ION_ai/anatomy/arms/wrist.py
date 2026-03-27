from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Wrist:
    name: str = "wrist"
    flexion: float = 0.0
    extension: float = 0.0
    deviation_radial: float = 0.0
    deviation_ulnar: float = 0.0

    def articulate(self, flexion: float, extension: float, radial: float, ulnar: float) -> "Wrist":
        self.flexion = flexion
        self.extension = extension
        self.deviation_radial = radial
        self.deviation_ulnar = ulnar
        return self
