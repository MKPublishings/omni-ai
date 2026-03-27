from __future__ import annotations

from typing import Any, Dict, Iterable, Mapping

from ._utils import as_id, average, clamp, get_nested


def simulate_existential_risks(
    civilizations: Iterable[Any],
    megaprojects: Mapping[str, Any],
    interciv: Mapping[str, Any],
    history: Mapping[str, Any],
    config: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    """Simulate existential risk detection, crisis response, and long-term consequences."""
    config = config or {}
    civilizations = list(civilizations)

    risks = _detect_risks(civilizations, megaprojects, interciv)
    probabilities = _model_risk_probabilities(risks, history, config)
    crises = _generate_crises(probabilities, civilizations, config)
    responses = _simulate_crisis_responses(crises, civilizations, interciv, megaprojects)
    resilience = _evaluate_resilience(responses, civilizations, config)
    consequences = _apply_long_term_consequences(resilience, civilizations, history)

    return {
        "risks": risks,
        "probabilities": probabilities,
        "crises": crises,
        "responses": responses,
        "resilience": resilience,
        "consequences": consequences,
    }


def _detect_risks(
    civilizations: Iterable[Any],
    megaprojects: Mapping[str, Any],
    interciv: Mapping[str, Any],
) -> Dict[str, Dict[str, float]]:
    del megaprojects
    risks: Dict[str, Dict[str, float]] = {}
    global_tension = clamp(float(interciv.get("global_tension", 0.35)))
    for civ in civilizations:
        civ_id = as_id(civ)
        risks[civ_id] = {
            "natural": clamp(get_nested(civ, "risks.natural", 0.3)),
            "technological": clamp(get_nested(civ, "risks.technological", 0.3)),
            "environmental": clamp(get_nested(civ, "risks.environmental", 0.3)),
            "social": clamp(get_nested(civ, "risks.social", 0.3)),
            "intercivilizational": global_tension,
        }
    return risks


def _model_risk_probabilities(
    risks: Mapping[str, Mapping[str, float]],
    history: Mapping[str, Any],
    config: Mapping[str, Any],
) -> Dict[str, Dict[str, float]]:
    cycle_factor = clamp(float(config.get("cycle_factor", 0.5)))
    memory_load = clamp(float(history.get("crisis_memory_load", 0.4))) if isinstance(history, Mapping) else 0.4

    probabilities: Dict[str, Dict[str, float]] = {}
    for civ_id, civ_risks in risks.items():
        probabilities[civ_id] = {
            key: round(clamp(value * (0.75 + 0.2 * cycle_factor + 0.15 * memory_load)), 4)
            for key, value in civ_risks.items()
        }
    return probabilities


def _generate_crises(
    probabilities: Mapping[str, Mapping[str, float]],
    civilizations: Iterable[Any],
    config: Mapping[str, Any],
) -> list[Dict[str, Any]]:
    del civilizations
    threshold = clamp(float(config.get("crisis_threshold", 0.58)))
    crises: list[Dict[str, Any]] = []

    for civ_id, civ_probabilities in probabilities.items():
        for risk_type, probability in civ_probabilities.items():
            if probability >= threshold:
                crises.append(
                    {
                        "civilization": civ_id,
                        "risk_type": risk_type,
                        "severity": round(clamp(probability), 4),
                    }
                )
    return crises


def _simulate_crisis_responses(
    crises: list[Dict[str, Any]],
    civilizations: Iterable[Any],
    interciv: Mapping[str, Any],
    megaprojects: Mapping[str, Any],
) -> Dict[str, Dict[str, float]]:
    del interciv
    del megaprojects

    responses: Dict[str, Dict[str, float]] = {as_id(civ): {"response_capacity": 0.0, "coordination": 0.0} for civ in civilizations}
    for crisis in crises:
        civ_id = str(crisis["civilization"])
        severity = float(crisis.get("severity", 0.0))
        response_capacity = clamp(1.0 - severity * 0.6)
        coordination = clamp(1.0 - severity * 0.5)

        current = responses.setdefault(civ_id, {"response_capacity": 0.0, "coordination": 0.0})
        current["response_capacity"] = clamp(max(current["response_capacity"], response_capacity))
        current["coordination"] = clamp(max(current["coordination"], coordination))

    return responses


def _evaluate_resilience(
    responses: Mapping[str, Mapping[str, float]],
    civilizations: Iterable[Any],
    config: Mapping[str, Any],
) -> Dict[str, Dict[str, float]]:
    del config
    resilience: Dict[str, Dict[str, float]] = {}
    for civ in civilizations:
        civ_id = as_id(civ)
        response = responses.get(civ_id, {"response_capacity": 0.0, "coordination": 0.0})
        infra = clamp(get_nested(civ, "resilience.infrastructure", 0.5))
        institutions = clamp(get_nested(civ, "resilience.institutions", 0.5))
        economy = clamp(get_nested(civ, "resilience.economy", 0.5))
        culture = clamp(get_nested(civ, "resilience.culture", 0.5))
        technology = clamp(get_nested(civ, "resilience.technology", 0.5))
        response_capacity = clamp(float(response.get("response_capacity", 0.0)))
        coordination = clamp(float(response.get("coordination", 0.0)))

        score = average([infra, institutions, economy, culture, technology, response_capacity, coordination])
        resilience[civ_id] = {
            "infrastructure_survival": round(infra, 4),
            "economic_continuity": round(economy, 4),
            "cultural_cohesion": round(culture, 4),
            "political_stability": round(institutions, 4),
            "resilience_score": round(clamp(score), 4),
        }
    return resilience


def _apply_long_term_consequences(
    resilience: Mapping[str, Mapping[str, float]],
    civilizations: Iterable[Any],
    history: Mapping[str, Any],
) -> Dict[str, Dict[str, Any]]:
    del history
    consequences: Dict[str, Dict[str, Any]] = {}
    for civ in civilizations:
        civ_id = as_id(civ)
        score = float(resilience.get(civ_id, {}).get("resilience_score", 0.0))
        if score >= 0.7:
            trajectory = "renewal"
        elif score >= 0.5:
            trajectory = "stabilization"
        elif score >= 0.35:
            trajectory = "fragmentation_risk"
        else:
            trajectory = "decline"

        consequences[civ_id] = {
            "trajectory": trajectory,
            "strategic_shift": "resilience_first" if score < 0.55 else "balanced_growth",
        }
    return consequences
