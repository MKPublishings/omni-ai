from __future__ import annotations

import unittest

from omni_ai.anatomy.torso import (
    AbdominalWall,
    BackMuscles,
    CirculatorySystem,
    ConnectiveTissue,
    Diaphragm,
    Heart,
    Intestines,
    Kidneys,
    Liver,
    Lungs,
    MetabolicSystem,
    Pelvis,
    RespiratorySystem,
    Ribcage,
    Spleen,
    SpineStructure,
    Stomach,
    Torso,
)
from omni_ai.envelope import OrganLoadModel, TorsoEnvelope, TorsoRequest


def build_test_torso() -> Torso:
    heart = Heart(max_cardiac_output_l_min=25.0, resting_heart_rate_bpm=70.0, stroke_volume_ml=70.0)
    lungs = Lungs(vital_capacity_l=4.8, resting_tidal_volume_ml=500.0, max_ventilation_l_min=180.0)
    return Torso(
        identity="torso-alpha",
        spine=SpineStructure(vertebrae_count=24, curvature_profile="cervical-thoracic-lumbar"),
        ribcage=Ribcage(rib_pairs=12, protective_index=0.92),
        pelvis=Pelvis(load_capacity_newton=5000.0),
        connective_tissue=ConnectiveTissue(elasticity_index=0.8, stability_index=0.88),
        heart=heart,
        lungs=lungs,
        liver=Liver(max_detox_rate=1.0, glycogen_capacity_kcal=450.0),
        stomach=Stomach(max_volume_ml=1500.0, emptying_rate_ml_min=3.0),
        intestines=Intestines(absorption_rate_kcal_min=2.0),
        kidneys=Kidneys(filtration_rate_ml_min=125.0),
        spleen=Spleen(blood_reservoir_ml=250.0),
        abdominal_wall=AbdominalWall(strength_index=0.75, endurance_index=0.8),
        back_muscles=BackMuscles(strength_index=0.82, posture_support_index=0.9),
        diaphragm=Diaphragm(contraction_force_index=700.0),
        circulatory_system=CirculatorySystem(heart=heart, blood_volume_l=5.0),
        respiratory_system=RespiratorySystem(lungs=lungs),
        metabolic_system=MetabolicSystem(
            basal_metabolic_rate_kcal_day=1600.0,
            organ_weights={"heart": 1.0, "lungs": 1.2, "liver": 1.6},
        ),
    )


class TorsoEnvelopeTests(unittest.TestCase):
    def test_torso_envelope_produces_structured_response(self) -> None:
        envelope = TorsoEnvelope(build_test_torso())
        request = TorsoRequest(
            heart_rate_bpm=88.0,
            breaths_per_minute=16.0,
            effort_level=0.6,
            total_energy_kcal=1200.0,
            glucose_level_mg_dl=92.0,
            lactate_level=1.4,
            organ_loads={
                "heart": OrganLoadModel(oxygen_demand=0.75, nutrient_demand=0.6, waste_level=0.2),
                "liver": OrganLoadModel(oxygen_demand=0.55, nutrient_demand=0.7, waste_level=0.3),
            },
        )

        response = envelope(request)

        self.assertAlmostEqual(response.circulatory.heart_rate_bpm, 88.0)
        self.assertAlmostEqual(response.circulatory.systolic_pressure, 120.0)
        self.assertAlmostEqual(response.respiratory.tidal_volume_ml, 420.0)
        self.assertGreater(response.respiratory.oxygen_intake_rate, 0.0)
        self.assertEqual(set(response.metabolic.organ_loads.keys()), {"heart", "liver"})


if __name__ == "__main__":
    unittest.main(verbosity=2)
