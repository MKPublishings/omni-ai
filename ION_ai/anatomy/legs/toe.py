from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Toe:
    name: str
    flexion: float = 0.0
    extension: float = 0.0

    def articulate(self, flexion: float, extension: float) -> "Toe":
        self.flexion = flexion
        self.extension = extension
        return self
