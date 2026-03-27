from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict

from .decision import evaluate_options, generate_options, infer_state, perceive_scenario, select_option
from .development import infer_life_stage, progress_traits_over_time
from .environment import Environment
from .genome import Genome
from .scenario import Scenario


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


@dataclass
class HumanInstance:
    id: str
    genome: Genome
    environment: Environment
    expressed_traits: Dict[str, float] = field(default_factory=dict)
    anatomical_profile: Dict[str, object] = field(default_factory=dict)
    age_years: int = 18
    life_stage: str = "adult"
    profile_modifiers: Dict[str, float] = field(default_factory=dict)

    @classmethod
    def develop(
        cls,
        id: str,
        genome: Genome,
        environment: Environment,
        age_years: int = 18,
    ) -> "HumanInstance":
        base = genome.express()
        influenced = {name: environment.influence(name, value) for name, value in base.items()}
        anatomy_index = influenced.get("reproductive_anatomy_index", 0.5)
        gamete_type = "ovum_producer" if anatomy_index >= 0.5 else "sperm_producer"
        life_stage = infer_life_stage(age_years)
        anatomy = {
            "reproductive_system": {
                "anatomical_only": True,
                "gamete_type": gamete_type,
                "anatomy_index": anatomy_index,
            }
        }
        return cls(
            id=id,
            genome=genome,
            environment=environment,
            expressed_traits=influenced,
            anatomical_profile=anatomy,
            age_years=age_years,
            life_stage=life_stage,
            profile_modifiers={
                "plasticity": 0.5,
                "stress_impact": 0.5,
                "learning_gain": 0.5,
            },
        )

    def progress_years(self, years: int, environment: Environment) -> None:
        self.age_years += max(0, years)
        self.life_stage = infer_life_stage(self.age_years)
        self.expressed_traits, _ = progress_traits_over_time(
            traits=self.expressed_traits,
            environment=environment,
            years=years,
            current_stage=self.life_stage,
        )
        self.profile_modifiers["learning_gain"] = _clamp_unit(self.profile_modifiers.get("learning_gain", 0.5) + (0.01 * years))
        self.profile_modifiers["stress_impact"] = _clamp_unit(self.profile_modifiers.get("stress_impact", 0.5) + ((environment.stress_load - 0.5) * 0.05 * years))

    def decide(self, scenario: Scenario) -> Dict[str, float | str]:
        perception = perceive_scenario(scenario, self.expressed_traits)
        inference = infer_state(perception, self.expressed_traits)
        options = generate_options(inference, self.expressed_traits)
        scored = evaluate_options(options, self.expressed_traits)
        choice = select_option(scored)

        confidence = _clamp_unit(float(choice["confidence"]) * (0.9 + (self.profile_modifiers.get("learning_gain", 0.5) * 0.2)))
        probability = _clamp_unit((float(choice["risk"]) * 0.4) + (float(choice["social_weight"]) * 0.2) + (confidence * 0.4))

        return {
            "agent_id": self.id,
            "confidence": confidence,
            "predicted_probability": probability,
            "selected_option": str(choice["label"]),
            "objective": scenario.objective,
        }
