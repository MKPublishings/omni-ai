from __future__ import annotations

import unittest

from ION_ai.anatomy.arms import Arm, BilateralArms
from ION_ai.anatomy.arms import ArmCommand
from ION_ai.anatomy.legs import BilateralLegs, Leg
from ION_ai.anatomy.legs import LegCommand
from ION_ai.envelope.arms import ArmsEnvelope
from ION_ai.envelope.arms_request import ArmsBilateralRequest
from ION_ai.envelope.legs import LegsEnvelope
from ION_ai.envelope.legs_request import LegsBilateralRequest
from ION_ai.registry import EnvelopeRegistry


class LimbEnvelopeTests(unittest.TestCase):
    def test_arms_envelope_accepts_mapping_request(self) -> None:
        envelope = ArmsEnvelope(Arm())
        response = envelope(
            {
                "shoulder": {"rotation": 18.0, "elevation": 35.0},
                "elbow": {"flexion": 60.0},
                "wrist": {"flexion": 12.0},
                "fingers": {"index": {"flexion": 45.0}},
                "contraction_intensity": 0.7,
            }
        )

        self.assertIn("state", response)
        self.assertIn("sensory", response)
        self.assertGreater(response["force_output_newton"], 0.0)
        self.assertIn("index", response["sensory"]["tactile_map"])

    def test_legs_envelope_accepts_mapping_request(self) -> None:
        envelope = LegsEnvelope(Leg())
        response = envelope(
            {
                "hip": {"flexion": 30.0},
                "knee": {"flexion": 40.0},
                "ankle": {"dorsiflexion": 10.0},
                "load_newton": 900.0,
                "contraction_intensity": 0.8,
                "gait_phase": "stance",
            }
        )

        self.assertIn("state", response)
        self.assertIn("balance", response)
        self.assertGreater(response["force_output_newton"], 0.0)
        self.assertAlmostEqual(response["balance"]["tibial_load"], 765.0)

    def test_envelope_registry_auto_registers_limbs(self) -> None:
        registry = EnvelopeRegistry(
            head=lambda _request: {"status": "ok"},
            torso=object(),
            arms=Arm(),
            legs=Leg(),
        )

        self.assertIsNotNone(registry.get("arms"))
        self.assertIsNotNone(registry.get("legs"))

    def test_bilateral_envelopes_accept_left_right_commands(self) -> None:
        arm_envelope = ArmsEnvelope(BilateralArms())
        arm_response = arm_envelope(
            {
                "left": {"elbow": {"flexion": 35.0}, "contraction_intensity": 0.4},
                "right": {"elbow": {"flexion": 70.0}, "contraction_intensity": 0.9},
            }
        )

        self.assertIn("left", arm_response["state"])
        self.assertIn("right", arm_response["state"])
        self.assertGreater(arm_response["force_output_newton"], 0.0)

        leg_envelope = LegsEnvelope(BilateralLegs())
        leg_response = leg_envelope(
            {
                "left": {"knee": {"flexion": 20.0}, "load_newton": 450.0},
                "right": {"knee": {"flexion": 25.0}, "load_newton": 550.0},
            }
        )

        self.assertIn("left", leg_response["state"])
        self.assertIn("right", leg_response["state"])
        self.assertIn("left", leg_response["balance"])
        self.assertIn("right", leg_response["balance"])

    def test_bilateral_envelopes_accept_typed_wrapper_requests(self) -> None:
        arm_envelope = ArmsEnvelope(BilateralArms())
        arm_request = ArmsBilateralRequest(
            left=ArmCommand(elbow={"flexion": 25.0}, contraction_intensity=0.3),
            right=ArmCommand(elbow={"flexion": 75.0}, contraction_intensity=0.9),
        )
        arm_response = arm_envelope(arm_request)

        self.assertIn("left", arm_response["state"])
        self.assertIn("right", arm_response["state"])
        self.assertGreater(arm_response["force_output_newton"], 0.0)

        leg_envelope = LegsEnvelope(BilateralLegs())
        leg_request = LegsBilateralRequest(
            left=LegCommand(load_newton=520.0, contraction_intensity=0.45),
            right=LegCommand(load_newton=610.0, contraction_intensity=0.65),
        )
        leg_response = leg_envelope(leg_request)

        self.assertIn("left", leg_response["state"])
        self.assertIn("right", leg_response["state"])
        self.assertIn("left", leg_response["balance"])
        self.assertIn("right", leg_response["balance"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
