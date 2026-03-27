from __future__ import annotations

from dataclasses import dataclass, field
from random import Random
from statistics import mean, pstdev
from typing import Dict, List, Literal, Optional

from .environment import Environment
from .instance import HumanInstance
from .population import PopulationManager
from .scenario import Scenario


PopulationMode = Literal["fixed", "auto"]


@dataclass
class PopulationResult:
    population_size: int
    average_confidence: float
    average_predicted_probability: float
    confidence_stddev: float
    probability_stddev: float
    selected_option_distribution: Dict[str, int] = field(default_factory=dict)
    domain_trait_averages: Dict[str, float] = field(default_factory=dict)
    outcomes: List[Dict[str, float | str]] = field(default_factory=list)


def _compute_domain_trait_averages(members: List[HumanInstance]) -> Dict[str, float]:
    domain_scores: Dict[str, List[float]] = {
        "physical": [],
        "cognitive": [],
        "personality": [],
        "reproductive": [],
    }
    for member in members:
        for trait_name, value in member.expressed_traits.items():
            if trait_name.startswith("physical_"):
                domain_scores["physical"].append(value)
            elif trait_name.startswith("cognitive_"):
                domain_scores["cognitive"].append(value)
            elif trait_name.startswith("personality_"):
                domain_scores["personality"].append(value)
            elif trait_name.startswith("reproductive_"):
                domain_scores["reproductive"].append(value)
    return {domain: (mean(values) if values else 0.0) for domain, values in domain_scores.items()}


def _auto_size(scenario: Scenario, minimum: int = 200, maximum: int = 10000) -> int:
    complexity = scenario.normalized_complexity()
    scaled = minimum + int((maximum - minimum) * complexity)
    return max(minimum, min(maximum, scaled))


def simulate_population(
    scenario: Scenario,
    population_mode: PopulationMode = "auto",
    population_size: Optional[int] = None,
    environment: Optional[Environment] = None,
    seed: int = 7,
    generations: int = 1,
    years_per_generation: int = 0,
) -> PopulationResult:
    env = environment or Environment()
    rng = Random(seed)
    manager = PopulationManager(rng=rng)

    if population_mode == "fixed":
        if population_size is None or population_size <= 0:
            raise ValueError("population_size must be provided and > 0 in fixed mode")
        target_size = population_size
    else:
        target_size = _auto_size(scenario)

    founder_count = min(64, target_size)
    founders = manager.create_founders(count=founder_count, environment=env)
    members: List[HumanInstance] = manager.expand_population(founders=founders, target_size=target_size, environment=env)

    if generations > 1 and years_per_generation > 0:
        manager.run_longitudinal_progression(
            members=members,
            years=(generations - 1) * years_per_generation,
            environment=env,
        )

    outcomes = [member.decide(scenario) for member in members]
    confidences = [float(outcome["confidence"]) for outcome in outcomes]
    probabilities = [float(outcome["predicted_probability"]) for outcome in outcomes]
    avg_conf = mean(confidences)
    avg_prob = mean(probabilities)
    conf_std = pstdev(confidences) if len(confidences) > 1 else 0.0
    prob_std = pstdev(probabilities) if len(probabilities) > 1 else 0.0

    selected_option_distribution: Dict[str, int] = {}
    for outcome in outcomes:
        option = str(outcome.get("selected_option", "unknown"))
        selected_option_distribution[option] = selected_option_distribution.get(option, 0) + 1

    domain_trait_averages = _compute_domain_trait_averages(members)

    return PopulationResult(
        population_size=len(members),
        average_confidence=avg_conf,
        average_predicted_probability=avg_prob,
        confidence_stddev=conf_std,
        probability_stddev=prob_std,
        selected_option_distribution=selected_option_distribution,
        domain_trait_averages=domain_trait_averages,
        outcomes=outcomes,
    )
