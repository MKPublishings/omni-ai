from __future__ import annotations

from dataclasses import asdict

from ION_ai.human.head.envelopes import HeadRequest, HeadResponse

from .facial import FACIAL_MUSCLES
from .mastication import MASTICATION_MUSCLES
from .ocular import OCULAR_MUSCLES
from .tongue import TONGUE_MUSCLES

ALL_MUSCLES = {**FACIAL_MUSCLES, **MASTICATION_MUSCLES, **OCULAR_MUSCLES, **TONGUE_MUSCLES}


def handle_muscles_request(req: HeadRequest) -> HeadResponse:
    if req.operation == "get_muscle":
        muscle_id = req.payload.get("id")
        muscle = ALL_MUSCLES.get(muscle_id)
        if not muscle:
            return HeadResponse(
                system="human_head",
                subsystem="muscles",
                operation=req.operation,
                status="error",
                error=f"Unknown muscle: {muscle_id}",
            )
        return HeadResponse(
            system="human_head",
            subsystem="muscles",
            operation=req.operation,
            status="ok",
            result={"muscle": asdict(muscle)},
        )

    if req.operation == "list_muscles":
        group = req.payload.get("group")
        muscles = ALL_MUSCLES.values()
        if group:
            muscles = [muscle for muscle in muscles if muscle.group == group]
        return HeadResponse(
            system="human_head",
            subsystem="muscles",
            operation=req.operation,
            status="ok",
            result={"muscles": [asdict(muscle) for muscle in muscles]},
        )

    return HeadResponse(
        system="human_head",
        subsystem="muscles",
        operation=req.operation,
        status="error",
        error=f"Unsupported muscles operation: {req.operation}",
    )


__all__ = [
    "FACIAL_MUSCLES",
    "MASTICATION_MUSCLES",
    "OCULAR_MUSCLES",
    "TONGUE_MUSCLES",
    "ALL_MUSCLES",
    "handle_muscles_request",
]
