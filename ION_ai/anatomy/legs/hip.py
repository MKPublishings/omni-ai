from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class HipJoint:
    rotation: float = 0.0
    flexion: float = 0.0
    extension: float = 0.0
    abduction: float = 0.0
    adduction: float = 0.0


@dataclass
class Hip:
    name: str = "hip"
    joint: HipJoint = field(default_factory=HipJoint)

    def articulate(self, **kwargs: float) -> HipJoint:
        for key, value in kwargs.items():
            if hasattr(self.joint, key):
                setattr(self.joint, key, value)
        return self.joint
