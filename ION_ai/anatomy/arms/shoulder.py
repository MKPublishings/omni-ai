from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ShoulderJoint:
    rotation: float = 0.0
    elevation: float = 0.0
    depression: float = 0.0


@dataclass
class Shoulder:
    name: str = "shoulder"
    joint: ShoulderJoint = field(default_factory=ShoulderJoint)

    def articulate(self, rotation: float, elevation: float, depression: float) -> ShoulderJoint:
        self.joint.rotation = rotation
        self.joint.elevation = elevation
        self.joint.depression = depression
        return self.joint
