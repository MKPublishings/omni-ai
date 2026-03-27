from __future__ import annotations

from dataclasses import dataclass, field

from omni_ai.anatomy.arms import ArmCommand


@dataclass(frozen=True)
class ArmsRequest:
    command: ArmCommand = field(default_factory=ArmCommand)


@dataclass(frozen=True)
class ArmsBilateralRequest:
    left: ArmCommand = field(default_factory=ArmCommand)
    right: ArmCommand = field(default_factory=ArmCommand)
