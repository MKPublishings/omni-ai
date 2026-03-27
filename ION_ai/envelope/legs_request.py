from __future__ import annotations

from dataclasses import dataclass, field

from omni_ai.anatomy.legs import LegCommand


@dataclass(frozen=True)
class LegsRequest:
    command: LegCommand = field(default_factory=LegCommand)


@dataclass(frozen=True)
class LegsBilateralRequest:
    left: LegCommand = field(default_factory=LegCommand)
    right: LegCommand = field(default_factory=LegCommand)
