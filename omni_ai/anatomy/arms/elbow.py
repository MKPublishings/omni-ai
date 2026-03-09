from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ElbowJoint:
    flexion: float = 0.0
    extension: float = 0.0


@dataclass
class Elbow:
    name: str = "elbow"
    joint: ElbowJoint = field(default_factory=ElbowJoint)

    def articulate(self, flexion: float, extension: float) -> ElbowJoint:
        self.joint.flexion = flexion
        self.joint.extension = extension
        return self.joint
