from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class KneeJoint:
    flexion: float = 0.0
    extension: float = 0.0
    rotation: float = 0.0


@dataclass
class Knee:
    name: str = "knee"
    joint: KneeJoint = field(default_factory=KneeJoint)

    def articulate(self, flexion: float, extension: float, rotation: float) -> KneeJoint:
        self.joint.flexion = flexion
        self.joint.extension = extension
        self.joint.rotation = rotation
        return self.joint
