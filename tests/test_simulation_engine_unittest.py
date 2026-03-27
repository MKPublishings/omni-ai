from __future__ import annotations

import unittest

from ION_ai.simulation import SimulationEngine, compute_interaction_vectors, run_simulation_tick
from ION_ai.simulation.intercivilizational import simulate_intercivilizational_dynamics


class SimulationEngineTests(unittest.TestCase):
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

    def test_run_simulation_tick_composes_layers(self) -> None:
        history: dict = {}
        result = run_simulation_tick(self.civs, history=history, config={"timelines": {"year": 200}})

        self.assertIn("intercivilizational", result)
        self.assertIn("grand_strategy", result)
        self.assertIn("megaprojects", result)
        self.assertIn("existential", result)
        self.assertIn("post_crisis", result)
        self.assertIn("timelines", result)

        self.assertIn("timeline_events", history)
        self.assertTrue(history["timeline_events"])
        self.assertIn("post_crisis_records", history)

    def test_engine_step_advances_tick_count(self) -> None:
        engine = SimulationEngine(self.civs, history={}, config={"timelines": {"year": 201}})

        first = engine.step()
        second = engine.step()

        self.assertEqual(engine.tick_count, 2)
        self.assertIs(engine.last_tick, second)
        self.assertIn("timelines", first)
        self.assertIn("timelines", second)
        self.assertIn("pulse", second)
        self.assertIn("subsystem_trace", second)
        self.assertIn("engine_pulse", engine.history)
        self.assertEqual(len(engine.history["engine_pulse"]), 2)

    def test_interaction_vectors_expose_formula_dimensions(self) -> None:
        vectors = compute_interaction_vectors(self.civs)
        self.assertTrue(vectors)
        vector = vectors[0]

        self.assertIn("trade_flows", vector)
        self.assertIn("diplomatic_ties", vector)
        self.assertIn("cultural_compatibility", vector)
        self.assertIn("technological_asymmetry", vector)
        self.assertIn("transportation_connectivity", vector)
        self.assertIn("military_posture", vector)
        self.assertIn("historical_memory", vector)
        self.assertIn("ideological_distance", vector)
        self.assertIn("crisis_interdependence", vector)

        self.assertGreaterEqual(vector["technological_asymmetry"], 0.0)
        self.assertLessEqual(vector["technological_asymmetry"], 1.0)

    def test_interaction_weighting_changes_event_outcome(self) -> None:
        civs = [
            {
                "id": "a",
                "name": "A",
                "economy": {"trade_openness": 0.0, "interdependence": 0.0},
                "culture": {"openness": 0.5},
                "technology": {"level": 0.6},
                "institutions": {"ideology_axis": 0.5},
                "relations": {
                    "b": {
                        "trade": 0.5,
                        "trust": 0.6,
                        "conflict_penalty": 0.55,
                        "linguistic_overlap": 0.6,
                        "migration": 0.6,
                        "media_exchange": 0.6,
                    }
                },
            },
            {
                "id": "b",
                "name": "B",
                "economy": {"trade_openness": 0.0, "interdependence": 0.0},
                "culture": {"openness": 0.5},
                "technology": {"level": 0.6},
                "institutions": {"ideology_axis": 0.5},
                "relations": {
                    "a": {
                        "trade": 0.5,
                        "trust": 0.6,
                        "conflict_penalty": 0.55,
                        "linguistic_overlap": 0.6,
                        "migration": 0.6,
                        "media_exchange": 0.6,
                    }
                },
            },
        ]

        baseline = simulate_intercivilizational_dynamics(civs, config={})
        weighted = simulate_intercivilizational_dynamics(
            civs,
            config={"interaction_weights": {"trade_flows": 3.0}},
        )

        baseline_event_types = {event["type"] for event in baseline["events"]}
        weighted_event_types = {event["type"] for event in weighted["events"]}

        self.assertNotIn("treaty", baseline_event_types)
        self.assertIn("treaty", weighted_event_types)

    def test_event_thresholds_can_suppress_treaty(self) -> None:
        civs = [
            {
                "id": "a",
                "name": "A",
                "economy": {"trade_openness": 0.0, "interdependence": 0.0},
                "culture": {"openness": 0.5},
                "technology": {"level": 0.6},
                "institutions": {"ideology_axis": 0.5},
                "relations": {
                    "b": {
                        "trade": 0.5,
                        "trust": 0.6,
                        "conflict_penalty": 0.55,
                        "linguistic_overlap": 0.6,
                        "migration": 0.6,
                        "media_exchange": 0.6,
                    }
                },
            },
            {
                "id": "b",
                "name": "B",
                "economy": {"trade_openness": 0.0, "interdependence": 0.0},
                "culture": {"openness": 0.5},
                "technology": {"level": 0.6},
                "institutions": {"ideology_axis": 0.5},
                "relations": {
                    "a": {
                        "trade": 0.5,
                        "trust": 0.6,
                        "conflict_penalty": 0.55,
                        "linguistic_overlap": 0.6,
                        "migration": 0.6,
                        "media_exchange": 0.6,
                    }
                },
            },
        ]

        weighted = simulate_intercivilizational_dynamics(
            civs,
            config={"interaction_weights": {"trade_flows": 3.0}},
        )
        constrained = simulate_intercivilizational_dynamics(
            civs,
            config={
                "interaction_weights": {"trade_flows": 3.0},
                "event_thresholds": {"treaty": 0.9},
            },
        )

        weighted_event_types = {event["type"] for event in weighted["events"]}
        constrained_event_types = {event["type"] for event in constrained["events"]}

        self.assertIn("treaty", weighted_event_types)
        self.assertNotIn("treaty", constrained_event_types)


if __name__ == "__main__":
    unittest.main(verbosity=2)
