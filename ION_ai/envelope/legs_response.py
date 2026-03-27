from __future__ import annotations

from dataclasses import dataclass

from omni_ai.anatomy.legs import BalanceState, BilateralLegBalance, BilateralLegState, LegState


@dataclass(frozen=True)
class LegsResponse:
    state: LegState
    balance: BalanceState


@dataclass(frozen=True)
class LegsBilateralResponse:
    state: BilateralLegState
    balance: BilateralLegBalance
