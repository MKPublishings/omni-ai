from __future__ import annotations

from dataclasses import dataclass


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


@dataclass
class Environment:
    """Clinical simulation context used by trait expression."""

    nutrition: float = 0.5
    activity: float = 0.5
    stress_load: float = 0.5
    information_access: float = 0.5
    resource_stability: float = 0.5

    def normalized(self) -> "Environment":
        return Environment(
            nutrition=_clamp_unit(self.nutrition),
            activity=_clamp_unit(self.activity),
            stress_load=_clamp_unit(self.stress_load),
            information_access=_clamp_unit(self.information_access),
            resource_stability=_clamp_unit(self.resource_stability),
        )

    def influence(self, trait_name: str, base_value: float) -> float:
        env = self.normalized()
        influence_map = {
            "physical_height": (env.nutrition - 0.5) * 0.20,
            "physical_limb_proportion": (env.nutrition - 0.5) * 0.05,
            "physical_structural_resilience": ((env.nutrition - 0.5) * 0.15) + ((env.resource_stability - 0.5) * 0.10),
            "physical_muscle_density": ((env.activity - 0.5) * 0.30) + ((env.nutrition - 0.5) * 0.10),
            "physical_metabolic_efficiency": ((env.activity - 0.5) * 0.10) + ((env.resource_stability - 0.5) * 0.10),
            "physical_lung_capacity": ((env.activity - 0.5) * 0.15) + ((env.stress_load - 0.5) * -0.05),
            "physical_facial_morphology": 0.0,
            "physical_sensory_acuity": ((env.resource_stability - 0.5) * 0.08),
            "physical_growth_curve": ((env.nutrition - 0.5) * 0.12),
            "cognitive_working_memory": ((env.information_access - 0.5) * 0.25) - ((env.stress_load - 0.5) * 0.15),
            "cognitive_processing_speed": ((env.information_access - 0.5) * 0.15) - ((env.stress_load - 0.5) * 0.12),
            "cognitive_pattern_recognition": ((env.information_access - 0.5) * 0.18),
            "cognitive_reasoning_style": ((env.information_access - 0.5) * 0.10),
            "cognitive_risk_evaluation": -((env.stress_load - 0.5) * 0.15),
            "cognitive_attention_control": ((env.stress_load - 0.5) * -0.20),
            "personality_cooperation": ((env.resource_stability - 0.5) * 0.20) - ((env.stress_load - 0.5) * 0.10),
            "personality_emotional_regulation": -((env.stress_load - 0.5) * 0.25),
            "personality_motivation_drive": ((env.resource_stability - 0.5) * 0.15),
            "personality_adaptability": ((env.information_access - 0.5) * 0.10),
            "personality_social_orientation": ((env.resource_stability - 0.5) * 0.10) - ((env.stress_load - 0.5) * 0.05),
            "personality_temperament_stability": -((env.stress_load - 0.5) * 0.20),
            "reproductive_fertility_window": ((env.nutrition - 0.5) * 0.08),
            "reproductive_gamete_stability": ((env.resource_stability - 0.5) * 0.08),
        }
        adjusted = base_value + influence_map.get(trait_name, 0.0)
        return _clamp_unit(adjusted)
