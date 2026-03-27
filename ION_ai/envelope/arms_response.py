from __future__ import annotations

from dataclasses import dataclass

from ION_ai.anatomy.arms import ArmSensoryData, ArmState, BilateralArmSensory, BilateralArmState


@dataclass(frozen=True)
class ArmsResponse:
    state: ArmState
    sensory: ArmSensoryData


@dataclass(frozen=True)
class ArmsBilateralResponse:
    state: BilateralArmState
    sensory: BilateralArmSensory
