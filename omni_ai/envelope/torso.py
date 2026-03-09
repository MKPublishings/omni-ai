from __future__ import annotations

from omni_ai.anatomy.torso import OrganLoad, Torso, fast_torso_tick

from .torso_request import TorsoRequest
from .torso_response import CirculatoryOut, MetabolicOut, RespiratoryOut, TorsoResponse


class TorsoEnvelope:
    def __init__(self, torso: Torso):
        self.torso = torso

    def __call__(self, request: TorsoRequest) -> TorsoResponse:
        organ_loads = {
            name: OrganLoad(
                oxygen_demand=load.oxygen_demand,
                nutrient_demand=load.nutrient_demand,
                waste_level=load.waste_level,
            )
            for name, load in request.organ_loads.items()
        }
        state = fast_torso_tick(
            torso=self.torso,
            heart_rate_bpm=request.heart_rate_bpm,
            breaths_per_minute=request.breaths_per_minute,
            effort_level=request.effort_level,
            total_energy_kcal=request.total_energy_kcal,
            glucose_level_mg_dl=request.glucose_level_mg_dl,
            lactate_level=request.lactate_level,
            organ_loads=organ_loads,
        )
        return TorsoResponse(
            circulatory=CirculatoryOut(**state.circulatory.__dict__),
            respiratory=RespiratoryOut(**state.respiratory.__dict__),
            metabolic=MetabolicOut(
                total_energy_kcal=state.metabolic.total_energy_kcal,
                glucose_level_mg_dl=state.metabolic.glucose_level_mg_dl,
                lactate_level=state.metabolic.lactate_level,
                organ_loads=request.organ_loads,
            ),
        )
