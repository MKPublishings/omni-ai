from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .muscles import AbdominalWall, BackMuscles, Diaphragm
from .organs import Heart, Intestines, Kidneys, Liver, Lungs, Spleen, Stomach
from .state import CirculatoryState, MetabolicState, OrganLoad, RespiratoryState, TorsoState
from .structure import ConnectiveTissue, Pelvis, Ribcage, SpineStructure
from .systems import CirculatorySystem, MetabolicSystem, RespiratorySystem


@dataclass
class Torso:
    identity: str
    spine: SpineStructure
    ribcage: Ribcage
    pelvis: Pelvis
    connective_tissue: ConnectiveTissue
    heart: Heart
    lungs: Lungs
    liver: Liver
    stomach: Stomach
    intestines: Intestines
    kidneys: Kidneys
    spleen: Spleen
    abdominal_wall: AbdominalWall
    back_muscles: BackMuscles
    diaphragm: Diaphragm
    circulatory_system: CirculatorySystem
    respiratory_system: RespiratorySystem
    metabolic_system: MetabolicSystem

    def validate(self) -> list[str]:
        errors: list[str] = []
        if self.spine.vertebrae_count <= 0:
            errors.append("Spine must define at least one vertebra.")
        if self.ribcage.rib_pairs <= 0:
            errors.append("Ribcage must define at least one rib pair.")
        if self.circulatory_system.blood_volume_l <= 0.0:
            errors.append("Blood volume must be positive.")
        if self.diaphragm.contraction_force_index <= 0.0:
            errors.append("Diaphragm contraction force must be positive.")
        return errors

    def snapshot_state(
        self,
        heart_rate_bpm: float,
        systolic_pressure: float,
        diastolic_pressure: float,
        breaths_per_minute: float,
        effort_level: float,
        total_energy_kcal: float,
        glucose_level_mg_dl: float,
        lactate_level: float,
        organ_loads: Mapping[str, OrganLoad],
    ) -> TorsoState:
        tidal_volume_ml = self.diaphragm.compute_tidal_volume_ml(effort_level)

        circulatory = CirculatoryState(
            heart_rate_bpm=heart_rate_bpm,
            systolic_pressure=systolic_pressure,
            diastolic_pressure=diastolic_pressure,
            blood_oxygen_saturation=0.97,
        )

        respiratory = RespiratoryState(
            breaths_per_minute=breaths_per_minute,
            tidal_volume_ml=tidal_volume_ml,
            oxygen_intake_rate=self.respiratory_system.simulate_breathing(
                breaths_per_minute=breaths_per_minute,
                tidal_volume_ml=tidal_volume_ml,
            ),
            co2_expulsion_rate=tidal_volume_ml * breaths_per_minute * 0.2,
        )

        metabolic = MetabolicState(
            total_energy_kcal=total_energy_kcal,
            glucose_level_mg_dl=glucose_level_mg_dl,
            lactate_level=lactate_level,
            organ_loads=organ_loads,
        )

        return TorsoState(
            circulatory=circulatory,
            respiratory=respiratory,
            metabolic=metabolic,
        )
