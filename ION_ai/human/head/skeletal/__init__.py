from __future__ import annotations

from dataclasses import asdict

from ION_ai.human.head.envelopes import HeadRequest, HeadResponse

from .bones import BONES
from .joints import JOINTS

SKULL_BONES = BONES


def handle_skeletal_request(req: HeadRequest) -> HeadResponse:
    if req.operation == "get_bone":
        bone_id = req.payload.get("id")
        bone = SKULL_BONES.get(bone_id)
        if not bone:
            return HeadResponse(
                system="human_head",
                subsystem="skeletal",
                operation=req.operation,
                status="error",
                error=f"Unknown bone: {bone_id}",
            )
        return HeadResponse(
            system="human_head",
            subsystem="skeletal",
            operation=req.operation,
            status="ok",
            result={"bone": asdict(bone)},
        )

    if req.operation == "list_bones":
        return HeadResponse(
            system="human_head",
            subsystem="skeletal",
            operation=req.operation,
            status="ok",
            result={"bones": [asdict(bone) for bone in SKULL_BONES.values()]},
        )

    return HeadResponse(
        system="human_head",
        subsystem="skeletal",
        operation=req.operation,
        status="error",
        error=f"Unsupported skeletal operation: {req.operation}",
    )


__all__ = ["BONES", "JOINTS", "SKULL_BONES", "handle_skeletal_request"]
