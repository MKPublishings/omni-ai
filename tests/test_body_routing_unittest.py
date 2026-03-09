from __future__ import annotations

import unittest

from omni_ai.anatomy.body import Body
from omni_ai.anatomy.routing import (
    CirculatoryRouter,
    MetabolicRouter,
    NeuralRouter,
    RoutingEngine,
    StateRouter,
)
from omni_ai.anatomy.spine import Spine, SpinalCord, SpinalCoupling, Vertebrae
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
from omni_ai.envelope import OrganLoadModel, TorsoRequest
from omni_ai.registry import EnvelopeRegistry


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


class BodyRoutingTests(unittest.TestCase):
    def test_body_tick_routes_through_spine(self) -> None:
        torso = build_test_torso()

        def fake_head_envelope(_request: object) -> dict:
            return {"status": "ok", "focus": "tracking"}

        extra_envelopes = {
            "arms": lambda _req: {"force_output_newton": 120.0, "fatigue_level": 0.1},
            "legs": lambda _req: {"force_output_newton": 260.0, "fatigue_level": 0.2},
        }

        envelope_registry = EnvelopeRegistry(head=fake_head_envelope, torso=torso, extra_envelopes=extra_envelopes)

        routing = RoutingEngine(
            neural=NeuralRouter(conduction_velocity_m_s=60.0, synaptic_delay_ms=1.5),
            circulatory=CirculatoryRouter(arterial_resistance=0.08, venous_resistance=0.1),
            metabolic=MetabolicRouter(distribution_efficiency=0.92),
            state=StateRouter(),
        )

        spine = Spine(
            vertebrae=Vertebrae(
                cervical_count=7,
                thoracic_count=12,
                lumbar_count=5,
                curvature_profile="cervical-thoracic-lumbar",
                load_capacity_newton=6000.0,
            ),
            spinal_cord=SpinalCord(conduction_velocity_m_s=58.0, reflex_latency_ms=3.2),
            coupling=SpinalCoupling(nerve_branch_points=6, vascular_branch_points=8),
        )

        body = Body(envelope_registry=envelope_registry, routing=routing, spine=spine)

        torso_request = TorsoRequest(
            heart_rate_bpm=90.0,
            breaths_per_minute=18.0,
            effort_level=0.7,
            total_energy_kcal=1500.0,
            glucose_level_mg_dl=98.0,
            lactate_level=1.6,
            organ_loads={
                "heart": OrganLoadModel(oxygen_demand=0.8, nutrient_demand=0.7, waste_level=0.25),
            },
        )

        result = body.tick(
            head_request={"query": "stabilize"},
            torso_request=torso_request,
            arm_request={"pose": "flex"},
            leg_request={"pose": "stance"},
            posture_angle_deg=6.0,
            spinal_load_newton=1200.0,
            signal_strength=0.85,
        )

        self.assertAlmostEqual(result.spine["posture_angle_deg"], 6.0)
        self.assertIn("neural", result.routing)
        self.assertIn("circulatory", result.routing)
        self.assertIn("metabolic", result.routing)
        self.assertGreater(result.routing["neural"]["spinal"]["latency_ms"], 0.0)
        self.assertAlmostEqual(result.routing["state"]["torso"].circulatory.heart_rate_bpm, 90.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
