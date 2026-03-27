from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Finger:
    name: str
    flexion: float = 0.0
    extension: float = 0.0
    strength: float = 1.0

    def articulate(self, flexion: float, extension: float) -> "Finger":
        self.flexion = flexion
        self.extension = extension
        return self
