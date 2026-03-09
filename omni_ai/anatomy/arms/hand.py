from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping

from .finger import Finger


def _default_fingers() -> dict[str, Finger]:
    return {
        "thumb": Finger(name="thumb", strength=1.2),
        "index": Finger(name="index"),
        "middle": Finger(name="middle"),
        "ring": Finger(name="ring", strength=0.9),
        "little": Finger(name="little", strength=0.8),
    }


@dataclass
class Hand:
    name: str = "hand"
    fingers: dict[str, Finger] = field(default_factory=_default_fingers)

    def grip_strength(self) -> float:
        return sum(finger.strength * max(0.0, finger.flexion / 90.0) for finger in self.fingers.values())

    def articulate_fingers(self, commands: Mapping[str, Mapping[str, float]]) -> dict[str, Finger]:
        for finger_name, values in commands.items():
            if finger_name not in self.fingers:
                continue
            self.fingers[finger_name].articulate(
                flexion=float(values.get("flexion", self.fingers[finger_name].flexion)),
                extension=float(values.get("extension", self.fingers[finger_name].extension)),
            )
        return self.fingers
