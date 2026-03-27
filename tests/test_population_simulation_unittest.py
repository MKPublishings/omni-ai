from __future__ import annotations

import unittest
from random import Random

from ION_ai.human.environment import Environment
from ION_ai.human.population import PopulationManager
from ION_ai.human.scenario import Scenario
from ION_ai.human.simulate import simulate_population


class PopulationSimulationTests(unittest.TestCase):
    def test_fixed_population_size(self) -> None:
        scenario = Scenario(context_type="market", complexity=0.6, objective="forecast")
        result = simulate_population(scenario=scenario, population_mode="fixed", population_size=120, seed=11)
        self.assertEqual(result.population_size, 120)
        self.assertEqual(len(result.outcomes), 120)
        self.assertIn("balanced", result.selected_option_distribution)

    def test_auto_population_scales_with_complexity(self) -> None:
        low = Scenario(context_type="policy", complexity=0.1, objective="estimate")
        high = Scenario(context_type="policy", complexity=0.9, objective="estimate")

        low_result = simulate_population(scenario=low, population_mode="auto", seed=11)
        high_result = simulate_population(scenario=high, population_mode="auto", seed=11)

        self.assertGreater(high_result.population_size, low_result.population_size)
        self.assertGreaterEqual(low_result.population_size, 200)
        self.assertLessEqual(high_result.population_size, 10000)

    def test_anatomical_reproductive_metadata_is_clinical_only(self) -> None:
        scenario = Scenario(context_type="social", complexity=0.3, objective="predict")
        result = simulate_population(scenario=scenario, population_mode="fixed", population_size=8, seed=19)

        for outcome in result.outcomes:
            self.assertIn("confidence", outcome)
            self.assertIn("predicted_probability", outcome)
            self.assertIn("selected_option", outcome)

        env = Environment(nutrition=0.6, activity=0.7, stress_load=0.4, information_access=0.8, resource_stability=0.6)
        manager = PopulationManager(rng=Random(19))
        member = manager.create_founders(count=1, environment=env)[0]
        reproductive = member.anatomical_profile["reproductive_system"]
        self.assertTrue(reproductive["anatomical_only"])
        self.assertIn(reproductive["gamete_type"], {"ovum_producer", "sperm_producer"})

        result_with_env = simulate_population(
            scenario=scenario,
            population_mode="fixed",
            population_size=1,
            environment=env,
            seed=19,
        )
        self.assertEqual(result_with_env.population_size, 1)
        self.assertTrue(0.0 <= result_with_env.average_confidence <= 1.0)
        self.assertTrue(0.0 <= result_with_env.average_predicted_probability <= 1.0)
        self.assertIn("physical", result_with_env.domain_trait_averages)
        self.assertIn("cognitive", result_with_env.domain_trait_averages)
        self.assertIn("personality", result_with_env.domain_trait_averages)

    def test_fixed_mode_requires_population_size(self) -> None:
        scenario = Scenario(context_type="events", complexity=0.5, objective="predict")
        with self.assertRaises(ValueError):
            simulate_population(scenario=scenario, population_mode="fixed", population_size=None)

    def test_longitudinal_progression_changes_distribution(self) -> None:
        scenario = Scenario(context_type="events", complexity=0.5, objective="predict")
        base = simulate_population(scenario=scenario, population_mode="fixed", population_size=80, seed=31)
        evolved = simulate_population(
            scenario=scenario,
            population_mode="fixed",
            population_size=80,
            seed=31,
            generations=3,
            years_per_generation=4,
        )

        self.assertEqual(base.population_size, evolved.population_size)
        self.assertNotEqual(base.average_confidence, evolved.average_confidence)


if __name__ == "__main__":
    unittest.main(verbosity=2)
