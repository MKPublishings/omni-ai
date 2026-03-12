from __future__ import annotations

import unittest

from omni_ai.simulation import (
    simulate_existential_risks,
    simulate_grand_strategy,
    simulate_intercivilizational_dynamics,
    simulate_megaprojects,
    simulate_multicivilization_timelines,
    simulate_post_crisis_evolution,
)


class SimulationStackTests(unittest.TestCase):
    def setUp(self) -> None:
        self.civs = [
            {
                "id": "aurora",
                "name": "Aurora Union",
                "economy": {"trade_openness": 0.8, "stability": 0.72},
                "culture": {"openness": 0.74, "unity": 0.63, "aspirational_intensity": 0.7, "fragility": 0.3},
                "technology": {"level": 0.78},
                "institutions": {"cohesion": 0.71},
                "demographics": {"growth": 0.58},
                "historical_memory": {"grievance": 0.15},
                "mobility": {"connectivity": 0.66},
                "resilience": {
                    "infrastructure": 0.67,
                    "institutions": 0.7,
                    "economy": 0.69,
                    "culture": 0.62,
                    "technology": 0.73,
                },
                "risks": {
                    "natural": 0.34,
                    "technological": 0.39,
                    "environmental": 0.36,
                    "social": 0.27,
                    "total": 0.41,
                },
                "relations": {
                    "borealis": {
                        "trade": 0.76,
                        "resource_flow": 0.72,
                        "cultural_affinity": 0.68,
                        "trust": 0.61,
                        "transport": 0.65,
                        "migration": 0.44,
                    }
                },
                "vulnerability": {"infrastructure": 0.3},
            },
            {
                "id": "borealis",
                "name": "Borealis Accord",
                "economy": {"trade_openness": 0.64, "stability": 0.61},
                "culture": {"openness": 0.6, "unity": 0.58, "aspirational_intensity": 0.63, "fragility": 0.34},
                "technology": {"level": 0.56},
                "institutions": {"cohesion": 0.57},
                "demographics": {"growth": 0.52},
                "historical_memory": {"grievance": 0.24},
                "mobility": {"connectivity": 0.55},
                "resilience": {
                    "infrastructure": 0.6,
                    "institutions": 0.58,
                    "economy": 0.57,
                    "culture": 0.59,
                    "technology": 0.55,
                },
                "risks": {
                    "natural": 0.42,
                    "technological": 0.44,
                    "environmental": 0.47,
                    "social": 0.4,
                    "total": 0.63,
                },
                "relations": {
                    "aurora": {
                        "trade": 0.7,
                        "resource_flow": 0.66,
                        "cultural_affinity": 0.62,
                        "trust": 0.56,
                        "transport": 0.59,
                        "migration": 0.39,
                    }
                },
                "vulnerability": {"infrastructure": 0.45},
            },
        ]

    def test_intercivilizational_pipeline_shape(self) -> None:
        result = simulate_intercivilizational_dynamics(self.civs, {"cooperation_bias": 0.05})
        self.assertIn("interactions", result)
        self.assertIn("events", result)
        self.assertIn("outcomes", result)
        self.assertIn("arcs", result)
        self.assertTrue(result["interactions"])
        self.assertTrue(result["events"])

    def test_grand_strategy_pipeline_shape(self) -> None:
        interciv = simulate_intercivilizational_dynamics(self.civs, {})
        result = simulate_grand_strategy(self.civs, interciv, history={}, config={})
        self.assertIn("posture", result)
        self.assertIn("objectives", result)
        self.assertIn("actions", result)
        self.assertIn("outcomes", result)
        self.assertIn("aurora", result["posture"])

    def test_megaprojects_pipeline_shape(self) -> None:
        civ = self.civs[0]
        result = simulate_megaprojects(
            civilization=civ,
            interciv={"competition_pressure": 0.52},
            economy={"infrastructure_strain": 0.66, "energy_pressure": 0.6, "capacity": 0.7, "build_speed": 0.65},
            culture={"alignment": 0.69},
            politics={"coalition_pressure": 0.55, "support": 0.63, "execution": 0.61},
            config={"time_pressure": 0.2},
        )
        self.assertIn("selected", result)
        self.assertIn("progress", result)
        self.assertIn("effects", result)
        self.assertIsNotNone(result["selected"]["name"])

    def test_existential_pipeline_shape(self) -> None:
        result = simulate_existential_risks(
            civilizations=self.civs,
            megaprojects={},
            interciv={"global_tension": 0.48},
            history={"crisis_memory_load": 0.43},
            config={"crisis_threshold": 0.55},
        )
        self.assertIn("risks", result)
        self.assertIn("probabilities", result)
        self.assertIn("responses", result)
        self.assertIn("resilience", result)
        self.assertIn("consequences", result)

    def test_post_crisis_pipeline_shape(self) -> None:
        history = {}
        result = simulate_post_crisis_evolution(
            civilization=self.civs[1],
            crisis={"severity": 0.62, "displacement_factor": 0.55},
            history=history,
            economy={"fragility": 0.5, "adaptability": 0.6},
            culture={"adaptability": 0.58},
            politics={"fragility": 0.56, "triage_capacity": 0.62, "reform_capacity": 0.57},
            config={"emergency_intensity": 0.48},
        )
        self.assertIn("trajectory", result)
        self.assertIn("post_crisis_records", history)
        self.assertTrue(history["post_crisis_records"])

    def test_timelines_pipeline_shape(self) -> None:
        history = {}
        result = simulate_multicivilization_timelines(
            civilizations=self.civs,
            interciv={"interaction_load": 0.57, "cooperation_index": 0.61, "competition_index": 0.45},
            history=history,
            config={"year": 120, "shared_shock_factor": 0.52},
        )
        self.assertIn("internal", result)
        self.assertIn("interactions", result)
        self.assertIn("shocks", result)
        self.assertIn("postcrisis", result)
        self.assertIn("arcs", result)
        self.assertIn("timeline_events", history)


if __name__ == "__main__":
    unittest.main(verbosity=2)
