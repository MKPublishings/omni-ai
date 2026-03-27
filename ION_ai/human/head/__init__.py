from __future__ import annotations

from ION_ai.human.head.brain.ops import handle_brain_request
from ION_ai.human.head.envelopes import HeadRequest, HeadResponse
from ION_ai.human.head.glands import handle_glands_request
from ION_ai.human.head.integration.functions import handle_integration_request
from ION_ai.human.head.muscles import handle_muscles_request
from ION_ai.human.head.nerves.ops import handle_nerves_request
from ION_ai.human.head.senses import handle_senses_request
from ION_ai.human.head.skeletal import handle_skeletal_request
from ION_ai.human.head.vascular import handle_vascular_request


def handle_head_request(req: HeadRequest) -> HeadResponse:
    if req.system != "human_head":
        return HeadResponse(
            system="human_head",
            subsystem=req.subsystem,
            operation=req.operation,
            status="error",
            error=f"Unsupported system: {req.system}",
        )

    if req.subsystem == "brain":
        return handle_brain_request(req)

    if req.subsystem == "nerves":
        return handle_nerves_request(req)

    if req.subsystem == "skeletal":
        return handle_skeletal_request(req)

    if req.subsystem == "muscles":
        return handle_muscles_request(req)

    if req.subsystem == "senses":
        return handle_senses_request(req)

    if req.subsystem == "vascular":
        return handle_vascular_request(req)

    if req.subsystem == "glands":
        return handle_glands_request(req)

    if req.subsystem == "integration":
        return handle_integration_request(req)

    return HeadResponse(
        system="human_head",
        subsystem=req.subsystem,
        operation=req.operation,
        status="error",
        error=f"Unsupported subsystem: {req.subsystem}",
    )


__all__ = ["handle_head_request", "HeadRequest", "HeadResponse"]
