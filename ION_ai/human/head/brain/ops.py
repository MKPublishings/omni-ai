from __future__ import annotations

from dataclasses import asdict

from ION_ai.human.head.envelopes import HeadRequest, HeadResponse
from ION_ai.human.head.brain.regions import BRAIN_REGIONS


def handle_brain_request(req: HeadRequest) -> HeadResponse:
    if req.operation == "get_region":
        region_id = req.payload.get("id")
        region = BRAIN_REGIONS.get(region_id)
        if not region:
            return HeadResponse(
                system="human_head",
                subsystem="brain",
                operation=req.operation,
                status="error",
                error=f"Unknown brain region: {region_id}",
            )
        return HeadResponse(
            system="human_head",
            subsystem="brain",
            operation=req.operation,
            status="ok",
            result={"region": asdict(region)},
        )

    if req.operation == "list_regions":
        return HeadResponse(
            system="human_head",
            subsystem="brain",
            operation=req.operation,
            status="ok",
            result={"regions": [asdict(region) for region in BRAIN_REGIONS.values()]},
        )

    return HeadResponse(
        system="human_head",
        subsystem="brain",
        operation=req.operation,
        status="error",
        error=f"Unsupported brain operation: {req.operation}",
    )
