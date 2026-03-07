from __future__ import annotations

from dataclasses import asdict

from omni_ai.human.head.envelopes import HeadRequest, HeadResponse

from .arteries import ARTERIES
from .sinuses import DURAL_SINUSES, SINUSES
from .veins import VEINS

ALL_VESSELS = {**ARTERIES, **VEINS, **SINUSES}


def handle_vascular_request(req: HeadRequest) -> HeadResponse:
	if req.operation == "get_vessel":
		vessel_id = req.payload.get("id")
		vessel = ALL_VESSELS.get(vessel_id)
		if not vessel:
			return HeadResponse(
				system="human_head",
				subsystem="vascular",
				operation=req.operation,
				status="error",
				error=f"Unknown vessel: {vessel_id}",
			)
		return HeadResponse(
			system="human_head",
			subsystem="vascular",
			operation=req.operation,
			status="ok",
			result={"vessel": asdict(vessel)},
		)

	if req.operation == "supply_map":
		territory = req.payload.get("territory")
		if not territory:
			return HeadResponse(
				system="human_head",
				subsystem="vascular",
				operation=req.operation,
				status="error",
				error="Missing required field: territory",
			)
		arteries = [
			asdict(artery)
			for artery in ARTERIES.values()
			if territory in artery.territory
		]
		return HeadResponse(
			system="human_head",
			subsystem="vascular",
			operation=req.operation,
			status="ok",
			result={"territory": territory, "arteries": arteries},
		)

	if req.operation == "drainage_map":
		territory = req.payload.get("territory")
		if not territory:
			return HeadResponse(
				system="human_head",
				subsystem="vascular",
				operation=req.operation,
				status="error",
				error="Missing required field: territory",
			)
		veins = [asdict(vein) for vein in VEINS.values() if territory in vein.territory]
		sinuses = [asdict(sinus) for sinus in SINUSES.values() if territory in sinus.territory]
		return HeadResponse(
			system="human_head",
			subsystem="vascular",
			operation=req.operation,
			status="ok",
			result={"territory": territory, "veins": veins, "sinuses": sinuses},
		)

	return HeadResponse(
		system="human_head",
		subsystem="vascular",
		operation=req.operation,
		status="error",
		error=f"Unsupported vascular operation: {req.operation}",
	)


__all__ = [
	"ARTERIES",
	"VEINS",
	"SINUSES",
	"DURAL_SINUSES",
	"ALL_VESSELS",
	"handle_vascular_request",
]
