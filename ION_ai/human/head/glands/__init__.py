from __future__ import annotations

from dataclasses import asdict

from ION_ai.human.head.envelopes import HeadRequest, HeadResponse

from .lacrimal import LACRIMAL_GLAND, LACRIMAL_GLANDS
from .salivary import SALIVARY_GLANDS

ALL_GLANDS = {**SALIVARY_GLANDS, **LACRIMAL_GLANDS}


def handle_glands_request(req: HeadRequest) -> HeadResponse:
	if req.operation == "get_gland":
		gland_id = req.payload.get("id")
		gland = ALL_GLANDS.get(gland_id)
		if not gland:
			return HeadResponse(
				system="human_head",
				subsystem="glands",
				operation=req.operation,
				status="error",
				error=f"Unknown gland: {gland_id}",
			)
		return HeadResponse(
			system="human_head",
			subsystem="glands",
			operation=req.operation,
			status="ok",
			result={"gland": asdict(gland)},
		)

	if req.operation == "list_glands":
		gland_type = req.payload.get("gland_type")
		glands = ALL_GLANDS.values()
		if gland_type:
			glands = [gland for gland in glands if gland.gland_type == gland_type]
		return HeadResponse(
			system="human_head",
			subsystem="glands",
			operation=req.operation,
			status="ok",
			result={"glands": [asdict(gland) for gland in glands]},
		)

	return HeadResponse(
		system="human_head",
		subsystem="glands",
		operation=req.operation,
		status="error",
		error=f"Unsupported glands operation: {req.operation}",
	)


__all__ = [
	"SALIVARY_GLANDS",
	"LACRIMAL_GLANDS",
	"LACRIMAL_GLAND",
	"ALL_GLANDS",
	"handle_glands_request",
]
