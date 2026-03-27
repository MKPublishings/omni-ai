from __future__ import annotations

from dataclasses import asdict

from ION_ai.human.head.envelopes import HeadRequest, HeadResponse

from .hearing import HEARING_ORGAN, HEARING_ORGANS
from .smell import SMELL_ORGAN, SMELL_ORGANS
from .somatosensory import SOMATOSENSORY_ORGAN, SOMATOSENSORY_ORGANS
from .taste import TASTE_ORGAN, TASTE_ORGANS
from .vision import VISION_ORGAN, VISION_ORGANS

ALL_ORGANS = {
    **VISION_ORGANS,
    **HEARING_ORGANS,
    **SMELL_ORGANS,
    **TASTE_ORGANS,
    **SOMATOSENSORY_ORGANS,
}


def handle_senses_request(req: HeadRequest) -> HeadResponse:
    if req.operation == "get_organ":
        organ_id = req.payload.get("id")
        organ = ALL_ORGANS.get(organ_id)
        if not organ:
            return HeadResponse(
                system="human_head",
                subsystem="senses",
                operation=req.operation,
                status="error",
                error=f"Unknown sense organ: {organ_id}",
            )
        return HeadResponse(
            system="human_head",
            subsystem="senses",
            operation=req.operation,
            status="ok",
            result={"organ": asdict(organ)},
        )

    if req.operation == "describe_pathway":
        organ_id = req.payload.get("id")
        organ = ALL_ORGANS.get(organ_id)
        if not organ:
            return HeadResponse(
                system="human_head",
                subsystem="senses",
                operation=req.operation,
                status="error",
                error=f"Unknown sense organ: {organ_id}",
            )
        return HeadResponse(
            system="human_head",
            subsystem="senses",
            operation=req.operation,
            status="ok",
            result={
                "organ": organ.name,
                "modality": organ.modality,
                "input_type": organ.input_type,
                "pathway": organ.output_path,
            },
        )

    if req.operation == "list_organs":
        modality = req.payload.get("modality")
        organs = ALL_ORGANS.values()
        if modality:
            organs = [organ for organ in organs if organ.modality == modality]
        return HeadResponse(
            system="human_head",
            subsystem="senses",
            operation=req.operation,
            status="ok",
            result={"organs": [asdict(organ) for organ in organs]},
        )

    return HeadResponse(
        system="human_head",
        subsystem="senses",
        operation=req.operation,
        status="error",
        error=f"Unsupported senses operation: {req.operation}",
    )


__all__ = [
    "VISION_ORGAN",
    "HEARING_ORGAN",
    "SMELL_ORGAN",
    "TASTE_ORGAN",
    "SOMATOSENSORY_ORGAN",
    "VISION_ORGANS",
    "HEARING_ORGANS",
    "SMELL_ORGANS",
    "TASTE_ORGANS",
    "SOMATOSENSORY_ORGANS",
    "ALL_ORGANS",
    "handle_senses_request",
]
