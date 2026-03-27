from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping

from .arm import Arm
from .models import ArmCommand, ArmState


@dataclass
class BilateralArmState:
    left: ArmState
    right: ArmState
    force_output_newton: float


@dataclass
class BilateralArmSensory:
    left: Mapping[str, float]
    right: Mapping[str, float]


@dataclass
class BilateralArms:
    name: str = "arms"
    left: Arm = field(default_factory=Arm)
    right: Arm = field(default_factory=Arm)

    def articulate(self, left_command: ArmCommand, right_command: ArmCommand) -> BilateralArmState:
        left_state = self.left.articulate(left_command)
        right_state = self.right.articulate(right_command)
        return BilateralArmState(
            left=left_state,
            right=right_state,
            force_output_newton=left_state.force_output_newton + right_state.force_output_newton,
        )

    def sense(self) -> BilateralArmSensory:
        left_sensory = self.left.sense()
        right_sensory = self.right.sense()
        return BilateralArmSensory(
            left={"proprioception_index": left_sensory.proprioception_index, "pain_signal": left_sensory.pain_signal},
            right={"proprioception_index": right_sensory.proprioception_index, "pain_signal": right_sensory.pain_signal},
        )
