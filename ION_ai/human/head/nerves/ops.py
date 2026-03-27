from __future__ import annotations

from dataclasses import asdict

from omni_ai.human.head.envelopes import HeadRequest, HeadResponse
from omni_ai.human.head.nerves.cranial import CRANIAL_NERVES


def handle_nerves_request(req: HeadRequest) -> HeadResponse:
    if req.operation == "get_cranial_nerve":
        number = req.payload.get("number")
        nerve = CRANIAL_NERVES.get(number)
        if not nerve:
            return HeadResponse(
                system="human_head",
                subsystem="nerves",
                operation=req.operation,
                status="error",
                error=f"Unknown cranial nerve: {number}",
            )
        return HeadResponse(
            system="human_head",
            subsystem="nerves",
            operation=req.operation,
            status="ok",
            result={"nerve": asdict(nerve)},
        )

    if req.operation == "list_cranial_nerves":
        return HeadResponse(
            system="human_head",
            subsystem="nerves",
            operation=req.operation,
            status="ok",
            result={"nerves": [asdict(nerve) for nerve in CRANIAL_NERVES.values()]},
        )

    return HeadResponse(
        system="human_head",
        subsystem="nerves",
        operation=req.operation,
        status="error",
        error=f"Unsupported nerves operation: {req.operation}",
    )
