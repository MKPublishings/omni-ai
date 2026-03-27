from __future__ import annotations

from dataclasses import asdict
from typing import Any, Mapping

from ION_ai.anatomy.arms import Arm, ArmCommand, BilateralArms

from .arms_request import ArmsBilateralRequest, ArmsRequest
from .arms_response import ArmsBilateralResponse, ArmsResponse


class ArmsEnvelope:
    def __init__(self, arms: Arm | BilateralArms):
        self.arms = arms

    def __call__(
        self,
        request: ArmsRequest | ArmsBilateralRequest | ArmCommand | Mapping[str, Any] | None,
    ) -> dict[str, Any]:
        if isinstance(self.arms, BilateralArms) and isinstance(request, ArmsBilateralRequest):
            state = self.arms.articulate(left_command=request.left, right_command=request.right)
            sensory = self.arms.sense()
            response = ArmsBilateralResponse(state=state, sensory=sensory)
            payload = asdict(response)
            payload["force_output_newton"] = state.force_output_newton
            payload["name"] = self.arms.name
            return payload

        if isinstance(self.arms, BilateralArms) and isinstance(request, Mapping):
            left_command = ArmCommand(**request.get("left", {}))
            right_command = ArmCommand(**request.get("right", {}))
            state = self.arms.articulate(left_command=left_command, right_command=right_command)
            sensory = self.arms.sense()
            response = ArmsBilateralResponse(state=state, sensory=sensory)
            payload = asdict(response)
            payload["force_output_newton"] = state.force_output_newton
            payload["name"] = self.arms.name
            return payload

        if request is None:
            command = ArmCommand()
        elif isinstance(request, ArmsRequest):
            command = request.command
        elif isinstance(request, ArmCommand):
            command = request
        else:
            command = ArmCommand(**request)

        if isinstance(self.arms, BilateralArms):
            left_command = command
            right_command = command

            state = self.arms.articulate(left_command=left_command, right_command=right_command)
            sensory = self.arms.sense()
            response = ArmsBilateralResponse(state=state, sensory=sensory)
            payload = asdict(response)
            payload["force_output_newton"] = state.force_output_newton
            payload["name"] = self.arms.name
            return payload

        state = self.arms.articulate(command)
        sensory = self.arms.sense()
        response = ArmsResponse(state=state, sensory=sensory)
        payload = asdict(response)
        payload["force_output_newton"] = state.force_output_newton
        payload["name"] = self.arms.name
        return payload
