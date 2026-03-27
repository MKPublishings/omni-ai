from __future__ import annotations

from dataclasses import asdict
from typing import Any, Mapping

from ION_ai.anatomy.legs import BilateralLegs, Leg, LegCommand

from .legs_request import LegsBilateralRequest, LegsRequest
from .legs_response import LegsBilateralResponse, LegsResponse


class LegsEnvelope:
    def __init__(self, legs: Leg | BilateralLegs):
        self.legs = legs

    def __call__(
        self,
        request: LegsRequest | LegsBilateralRequest | LegCommand | Mapping[str, Any] | None,
    ) -> dict[str, Any]:
        if isinstance(self.legs, BilateralLegs) and isinstance(request, LegsBilateralRequest):
            state = self.legs.articulate(left_command=request.left, right_command=request.right)
            balance = self.legs.balance(
                left_load=request.left.load_newton,
                right_load=request.right.load_newton,
                gait_phase=request.left.gait_phase,
            )
            response = LegsBilateralResponse(state=state, balance=balance)
            payload = asdict(response)
            payload["force_output_newton"] = state.force_output_newton
            payload["name"] = self.legs.name
            return payload

        if isinstance(self.legs, BilateralLegs) and isinstance(request, Mapping):
            left_command = LegCommand(**request.get("left", {}))
            right_command = LegCommand(**request.get("right", {}))
            state = self.legs.articulate(left_command=left_command, right_command=right_command)
            balance = self.legs.balance(
                left_load=left_command.load_newton,
                right_load=right_command.load_newton,
                gait_phase=left_command.gait_phase,
            )
            response = LegsBilateralResponse(state=state, balance=balance)
            payload = asdict(response)
            payload["force_output_newton"] = state.force_output_newton
            payload["name"] = self.legs.name
            return payload

        if request is None:
            command = LegCommand()
        elif isinstance(request, LegsRequest):
            command = request.command
        elif isinstance(request, LegCommand):
            command = request
        else:
            command = LegCommand(**request)

        if isinstance(self.legs, BilateralLegs):
            left_command = command
            right_command = command

            state = self.legs.articulate(left_command=left_command, right_command=right_command)
            balance = self.legs.balance(
                left_load=left_command.load_newton,
                right_load=right_command.load_newton,
                gait_phase=left_command.gait_phase,
            )
            response = LegsBilateralResponse(state=state, balance=balance)
            payload = asdict(response)
            payload["force_output_newton"] = state.force_output_newton
            payload["name"] = self.legs.name
            return payload

        state = self.legs.articulate(command)
        balance = self.legs.balance(load=command.load_newton, gait_phase=command.gait_phase)
        response = LegsResponse(state=state, balance=balance)
        payload = asdict(response)
        payload["force_output_newton"] = state.force_output_newton
        payload["name"] = self.legs.name
        return payload
