from __future__ import annotations

from typing import Any, Dict, Mapping

from ._utils import average, clamp, get_nested


def simulate_post_crisis_evolution(
    civilization: Mapping[str, Any],
    crisis: Mapping[str, Any],
    history: Dict[str, Any],
    economy: Mapping[str, Any],
    culture: Mapping[str, Any],
    politics: Mapping[str, Any],
    config: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    """Model post-crisis stabilization, reforms, and long-term trajectory."""
    config = config or {}
    impact = _assess_crisis_impact(crisis, civilization, economy, politics)
    stabilization = _simulate_stabilization_phase(impact, civilization, politics, config)
    reforms = _simulate_reform_phase(stabilization, civilization, economy, culture, politics)
    trajectory = _determine_post_crisis_trajectory(reforms, culture, politics, economy)
    _update_civilizational_memory(history, crisis, trajectory, reforms)
    return {
        "impact": impact,
        "stabilization": stabilization,
        "reforms": reforms,
        "trajectory": trajectory,
    }


def _assess_crisis_impact(
    crisis: Mapping[str, Any],
    civilization: Mapping[str, Any],
    economy: Mapping[str, Any],
    politics: Mapping[str, Any],
) -> Dict[str, float]:
    severity = clamp(float(crisis.get("severity", 0.5)))
    return {
        "infrastructure_damage": round(clamp(severity * average([1.0, get_nested(civilization, "vulnerability.infrastructure", 0.5)])), 4),
        "institutional_stress": round(clamp(severity * average([1.0, get_nested(politics, "fragility", 0.5)])), 4),
        "economic_disruption": round(clamp(severity * average([1.0, get_nested(economy, "fragility", 0.5)])), 4),
        "cultural_fragmentation": round(clamp(severity * average([1.0, get_nested(civilization, "culture.fragility", 0.5)])), 4),
        "population_displacement": round(clamp(severity * float(crisis.get("displacement_factor", 0.6))), 4),
    }


def _simulate_stabilization_phase(
    impact: Mapping[str, float],
    civilization: Mapping[str, Any],
    politics: Mapping[str, Any],
    config: Mapping[str, Any],
) -> Dict[str, float]:
    del civilization
    triage_capacity = clamp(get_nested(politics, "triage_capacity", 0.5))
    emergency_intensity = clamp(float(config.get("emergency_intensity", 0.5)))
    damage_index = average(impact.values(), fallback=0.0)

    stabilization_score = clamp(triage_capacity * (1.0 - 0.55 * damage_index) + emergency_intensity * 0.25)

    return {
        "governance_continuity": round(clamp(stabilization_score + 0.05), 4),
        "infrastructure_recovery": round(clamp(stabilization_score), 4),
        "communication_recovery": round(clamp(stabilization_score + 0.1), 4),
        "public_sentiment_stability": round(clamp(stabilization_score - 0.05), 4),
    }


def _simulate_reform_phase(
    stabilization: Mapping[str, float],
    civilization: Mapping[str, Any],
    economy: Mapping[str, Any],
    culture: Mapping[str, Any],
    politics: Mapping[str, Any],
) -> Dict[str, float]:
    baseline = average(stabilization.values(), fallback=0.0)
    institutional_reform = clamp(average([baseline, get_nested(politics, "reform_capacity", 0.5)]))
    economic_reallocation = clamp(average([baseline, get_nested(economy, "adaptability", 0.5)]))
    cultural_shift = clamp(average([baseline, get_nested(culture, "adaptability", 0.5)]))
    technology_reprioritization = clamp(average([baseline, get_nested(civilization, "technology.level", 0.5)]))

    return {
        "institutional_reform": round(institutional_reform, 4),
        "economic_reallocation": round(economic_reallocation, 4),
        "cultural_shift": round(cultural_shift, 4),
        "technology_reprioritization": round(technology_reprioritization, 4),
    }


def _determine_post_crisis_trajectory(
    reforms: Mapping[str, float],
    culture: Mapping[str, Any],
    politics: Mapping[str, Any],
    economy: Mapping[str, Any],
) -> Dict[str, Any]:
    del culture
    del politics
    del economy
    reform_score = average(reforms.values(), fallback=0.0)

    if reform_score >= 0.75:
        path = "renewal_renaissance"
    elif reform_score >= 0.58:
        path = "stabilization_consolidation"
    elif reform_score >= 0.42:
        path = "fragmentation_divergence"
    elif reform_score >= 0.3:
        path = "stagnation_decline"
    else:
        path = "civilizational_metamorphosis"

    return {
        "path": path,
        "reform_score": round(clamp(reform_score), 4),
    }


def _update_civilizational_memory(
    history: Dict[str, Any],
    crisis: Mapping[str, Any],
    trajectory: Mapping[str, Any],
    reforms: Mapping[str, float],
) -> None:
    records = history.setdefault("post_crisis_records", [])
    records.append(
        {
            "crisis": dict(crisis),
            "trajectory": dict(trajectory),
            "reforms": dict(reforms),
        }
    )
