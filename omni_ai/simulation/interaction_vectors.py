from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping

from ._utils import as_id, as_name, average, clamp, get_nested, relation_lookup


def compute_interaction_vectors(civilizations: Iterable[Any], config: Mapping[str, Any] | None = None) -> List[Dict[str, Any]]:
    """Compute structural interaction vectors for every civilization pair."""
    config = config or {}
    weights = config.get("interaction_weights", {}) if isinstance(config, Mapping) else {}
    if not isinstance(weights, Mapping):
        weights = {}
    civilizations = list(civilizations)
    vectors: List[Dict[str, Any]] = []

    for idx, civ_a in enumerate(civilizations):
        for civ_b in civilizations[idx + 1 :]:
            civ_a_id = as_id(civ_a)
            civ_b_id = as_id(civ_b)

            relation_a = relation_lookup(civ_a, civ_b_id)
            relation_b = relation_lookup(civ_b, civ_a_id)

            economic_link = _economic_linkage(civ_a, civ_b, relation_a, relation_b)
            cultural_affinity = _cultural_affinity(civ_a, civ_b, relation_a, relation_b)
            diplomatic_trust = _diplomatic_trust(relation_a, relation_b)
            technological_gap = _technological_gap(civ_a, civ_b)
            military_posture = _military_posture(relation_a, relation_b)
            mobility_connectivity = _mobility_connectivity(relation_a, relation_b)
            historical_memory = _historical_memory(relation_a, relation_b)
            ideological_distance = _ideological_distance(civ_a, civ_b)
            crisis_interdependence = _crisis_interdependence(relation_a, relation_b)

            vectors.append(
                {
                    "pair": (civ_a_id, civ_b_id),
                    "pair_names": (as_name(civ_a), as_name(civ_b)),
                    "trade_flows": _apply_weight(economic_link, "trade_flows", weights),
                    "diplomatic_ties": _apply_weight(diplomatic_trust, "diplomatic_ties", weights),
                    "cultural_compatibility": _apply_weight(cultural_affinity, "cultural_compatibility", weights),
                    "technological_asymmetry": _apply_weight(technological_gap, "technological_asymmetry", weights),
                    "transportation_connectivity": _apply_weight(mobility_connectivity, "transportation_connectivity", weights),
                    "military_posture": _apply_weight(military_posture, "military_posture", weights),
                    "historical_memory": _apply_weight(historical_memory, "historical_memory", weights),
                    "ideological_distance": _apply_weight(ideological_distance, "ideological_distance", weights),
                    "crisis_interdependence": _apply_weight(crisis_interdependence, "crisis_interdependence", weights),
                }
            )

    return vectors


def _pair_value(relation_a: Mapping[str, float], relation_b: Mapping[str, float], key: str, default: float = 0.0) -> float:
    return average([float(relation_a.get(key, default)), float(relation_b.get(key, default))])


def _economic_linkage(civ_a: Any, civ_b: Any, relation_a: Mapping[str, float], relation_b: Mapping[str, float]) -> float:
    trade_volume = _pair_value(relation_a, relation_b, "trade", 0.0)
    supply_dependency = _pair_value(relation_a, relation_b, "supply_dependency", 0.0)
    resource_flow = _pair_value(relation_a, relation_b, "resource_flow", 0.0)
    investment_exposure = _pair_value(relation_a, relation_b, "investment_exposure", 0.0)

    # Fallbacks from internal economy if relation-level metrics are sparse.
    supply_dependency = max(supply_dependency, average([get_nested(civ_a, "economy.interdependence", 0.0), get_nested(civ_b, "economy.interdependence", 0.0)]))
    investment_exposure = max(investment_exposure, average([get_nested(civ_a, "economy.trade_openness", 0.0), get_nested(civ_b, "economy.trade_openness", 0.0)]))

    return clamp(0.35 * trade_volume + 0.25 * supply_dependency + 0.2 * resource_flow + 0.2 * investment_exposure)


def _cultural_affinity(civ_a: Any, civ_b: Any, relation_a: Mapping[str, float], relation_b: Mapping[str, float]) -> float:
    linguistic_overlap = _pair_value(relation_a, relation_b, "linguistic_overlap", 0.0)
    migration_affinity = _pair_value(relation_a, relation_b, "migration", 0.0)
    media_exchange = _pair_value(relation_a, relation_b, "media_exchange", 0.0)
    generational_alignment = 1.0 - abs(get_nested(civ_a, "culture.openness", 0.5) - get_nested(civ_b, "culture.openness", 0.5))

    return clamp(average([linguistic_overlap, migration_affinity, media_exchange, generational_alignment]))


def _diplomatic_trust(relation_a: Mapping[str, float], relation_b: Mapping[str, float]) -> float:
    historical_cooperation = _pair_value(relation_a, relation_b, "historical_cooperation", _pair_value(relation_a, relation_b, "trust", 0.4))
    conflict_penalty = _pair_value(relation_a, relation_b, "conflict_penalty", 0.0)
    treaty_compliance = _pair_value(relation_a, relation_b, "treaty_compliance", _pair_value(relation_a, relation_b, "trust", 0.4))

    signed_score = clamp(historical_cooperation - conflict_penalty + treaty_compliance, -1.0, 1.0)
    return _norm_11_to_01(signed_score)


def _technological_gap(civ_a: Any, civ_b: Any) -> float:
    tech_a = get_nested(civ_a, "technology.level", 0.0)
    tech_b = get_nested(civ_b, "technology.level", 0.0)
    denominator = tech_a + tech_b
    if denominator <= 0.0:
        return 0.0
    return clamp(abs(tech_a - tech_b) / denominator)


def _military_posture(relation_a: Mapping[str, float], relation_b: Mapping[str, float]) -> float:
    defensive_readiness = _pair_value(relation_a, relation_b, "defensive_readiness", 0.0)
    border_tension = _pair_value(relation_a, relation_b, "border_tension", 0.0)
    alliance_risk = _pair_value(relation_a, relation_b, "alliance_risk", 0.0)
    return clamp(average([defensive_readiness, border_tension, alliance_risk]))


def _mobility_connectivity(relation_a: Mapping[str, float], relation_b: Mapping[str, float]) -> float:
    rail = _pair_value(relation_a, relation_b, "rail_connectivity", _pair_value(relation_a, relation_b, "transport", 0.0))
    air = _pair_value(relation_a, relation_b, "air_connectivity", _pair_value(relation_a, relation_b, "transport", 0.0))
    orbital = _pair_value(relation_a, relation_b, "orbital_connectivity", _pair_value(relation_a, relation_b, "transport", 0.0))
    return clamp(average([rail, air, orbital]))


def _historical_memory(relation_a: Mapping[str, float], relation_b: Mapping[str, float]) -> float:
    cooperation_legacy = _pair_value(relation_a, relation_b, "cooperation_legacy", 0.0)
    conflict_legacy = _pair_value(relation_a, relation_b, "conflict_legacy", 0.0)
    shared_crisis_memory = _pair_value(relation_a, relation_b, "shared_crisis_memory", 0.0)
    signed_score = clamp(cooperation_legacy - conflict_legacy + shared_crisis_memory, -1.0, 1.0)
    return _norm_11_to_01(signed_score)


def _ideological_distance(civ_a: Any, civ_b: Any) -> float:
    axis_a = get_nested(civ_a, "institutions.ideology_axis", get_nested(civ_a, "culture.openness", 0.5))
    axis_b = get_nested(civ_b, "institutions.ideology_axis", get_nested(civ_b, "culture.openness", 0.5))
    return clamp(abs(axis_a - axis_b))


def _crisis_interdependence(relation_a: Mapping[str, float], relation_b: Mapping[str, float]) -> float:
    environmental_overlap = _pair_value(relation_a, relation_b, "environmental_overlap", 0.0)
    health_interdependence = _pair_value(relation_a, relation_b, "health_interdependence", 0.0)
    infrastructure_coupling = _pair_value(relation_a, relation_b, "infrastructure_coupling", 0.0)
    return clamp(average([environmental_overlap, health_interdependence, infrastructure_coupling]))


def _norm_11_to_01(value: float) -> float:
    return clamp((value + 1.0) * 0.5)


def _apply_weight(value: float, dimension: str, weights: Mapping[str, Any]) -> float:
    raw_weight = weights.get(dimension, 1.0)
    try:
        weight = float(raw_weight)
    except (TypeError, ValueError):
        weight = 1.0
    weight = clamp(weight, 0.0, 3.0)
    return clamp(value * weight)
