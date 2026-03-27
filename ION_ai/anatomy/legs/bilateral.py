from __future__ import annotations

from dataclasses import dataclass, field

from .leg import Leg
from .models import BalanceState, LegCommand, LegState


@dataclass
class BilateralLegState:
    left: LegState
    right: LegState
    force_output_newton: float


@dataclass
class BilateralLegBalance:
    left: BalanceState
    right: BalanceState


@dataclass
class BilateralLegs:
    name: str = "legs"
    left: Leg = field(default_factory=Leg)
    right: Leg = field(default_factory=Leg)

    def articulate(self, left_command: LegCommand, right_command: LegCommand) -> BilateralLegState:
        left_state = self.left.articulate(left_command)
        right_state = self.right.articulate(right_command)
        return BilateralLegState(
            left=left_state,
            right=right_state,
            force_output_newton=left_state.force_output_newton + right_state.force_output_newton,
        )

    def balance(self, left_load: float, right_load: float, gait_phase: str) -> BilateralLegBalance:
        return BilateralLegBalance(
            left=self.left.balance(load=left_load, gait_phase=gait_phase),
            right=self.right.balance(load=right_load, gait_phase=gait_phase),
        )
