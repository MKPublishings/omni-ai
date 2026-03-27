from __future__ import annotations

from typing import Any, Dict, Iterable, Mapping

from ._utils import as_id, average, clamp, get_nested


def simulate_grand_strategy(
    civilizations: Iterable[Any],
    interciv: Mapping[str, Any],
    history: Mapping[str, Any] | None,
    config: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    """Derive strategic posture, objectives, actions, and outcomes for each civilization."""
    config = config or {}
    civilizations = list(civilizations)

    internal = _evaluate_internal_conditions(civilizations, history or {})
    external = _evaluate_external_conditions(civilizations, interciv)
    posture = _determine_strategic_posture(internal, external, config)
    objectives = _generate_strategic_objectives(posture, internal, external, config)
    actions = _select_strategic_actions(objectives, civilizations, config)
    outcomes = _evaluate_strategic_outcomes(actions, civilizations, interciv)
    _update_civilizational_identity_from_strategy(civilizations, outcomes, history or {})

    return {
        "posture": posture,
        "objectives": objectives,
        "actions": actions,
        "outcomes": outcomes,
        "internal": internal,
        "external": external,
    }


def _evaluate_internal_conditions(civilizations: Iterable[Any], history: Mapping[str, Any]) -> Dict[str, Dict[str, float]]:
    del history
    internal: Dict[str, Dict[str, float]] = {}
    for civ in civilizations:
        civ_id = as_id(civ)
        internal[civ_id] = {
            "economic_stability": clamp(get_nested(civ, "economy.stability", 0.5)),
            "political_cohesion": clamp(get_nested(civ, "institutions.cohesion", 0.5)),
            "cultural_unity": clamp(get_nested(civ, "culture.unity", 0.5)),
            "technological_capability": clamp(get_nested(civ, "technology.level", 0.5)),
            "demographic_trend": clamp(get_nested(civ, "demographics.growth", 0.5)),
        }
    return internal


def _evaluate_external_conditions(civilizations: Iterable[Any], interciv: Mapping[str, Any]) -> Dict[str, Dict[str, float]]:
    outcomes = interciv.get("outcomes", {}) if isinstance(interciv, Mapping) else {}
    external: Dict[str, Dict[str, float]] = {}
    for civ in civilizations:
        civ_id = as_id(civ)
        outcomes_for_civ = outcomes.get(civ_id, {}) if isinstance(outcomes, Mapping) else {}
        external[civ_id] = {
            "neighbor_tension": clamp(float(outcomes_for_civ.get("tension", 0.3))),
            "diplomatic_opportunity": clamp(float(outcomes_for_civ.get("cooperation", 0.3))),
            "innovation_pressure": clamp(float(outcomes_for_civ.get("innovation", 0.3))),
            "transport_connectivity": clamp(get_nested(civ, "mobility.connectivity", 0.4)),
        }
    return external


def _determine_strategic_posture(
    internal: Mapping[str, Mapping[str, float]],
    external: Mapping[str, Mapping[str, float]],
    config: Mapping[str, Any],
) -> Dict[str, str]:
    del config
    posture: Dict[str, str] = {}
    for civ_id, internals in internal.items():
        externals = external.get(civ_id, {})
        tension = float(externals.get("neighbor_tension", 0.0))
        diplomacy = float(externals.get("diplomatic_opportunity", 0.0))
        tech = float(internals.get("technological_capability", 0.0))
        cohesion = float(internals.get("political_cohesion", 0.0))
        unity = float(internals.get("cultural_unity", 0.0))

        if tension > 0.65 and cohesion < 0.65:
            posture[civ_id] = "defensive"
        elif tech > 0.72 and tension >= 0.5:
            posture[civ_id] = "expansionist"
        elif tech > 0.72:
            posture[civ_id] = "technocratic"
        elif diplomacy > 0.6 and unity > 0.5:
            posture[civ_id] = "cooperative"
        elif unity >= 0.7:
            posture[civ_id] = "cultural_centric"
        else:
            posture[civ_id] = "hybrid"
    return posture


def _generate_strategic_objectives(
    posture: Mapping[str, str],
    internal: Mapping[str, Mapping[str, float]],
    external: Mapping[str, Mapping[str, float]],
    config: Mapping[str, Any],
) -> Dict[str, list[str]]:
    del config
    objectives: Dict[str, list[str]] = {}
    for civ_id, strategy in posture.items():
        internals = internal[civ_id]
        externals = external[civ_id]
        civ_objectives: list[str] = []

        if strategy in {"expansionist", "technocratic"}:
            civ_objectives.append("expand_infrastructure_reach")
            civ_objectives.append("accelerate_research_programs")
        if strategy in {"cooperative", "hybrid"}:
            civ_objectives.append("deepen_trade_corridors")
            civ_objectives.append("form_multilateral_compacts")
        if strategy == "defensive":
            civ_objectives.append("fortify_resilience_systems")
            civ_objectives.append("stabilize_internal_politics")
        if strategy == "cultural_centric":
            civ_objectives.append("preserve_cultural_continuity")

        if internals["economic_stability"] < 0.45:
            civ_objectives.append("repair_economic_foundations")
        if externals["neighbor_tension"] > 0.6:
            civ_objectives.append("deescalate_regional_tensions")

        objectives[civ_id] = list(dict.fromkeys(civ_objectives)) or ["maintain_strategic_balance"]
    return objectives


def _select_strategic_actions(
    objectives: Mapping[str, list[str]],
    civilizations: Iterable[Any],
    config: Mapping[str, Any],
) -> Dict[str, list[str]]:
    del civilizations
    del config
    action_map = {
        "expand_infrastructure_reach": "launch_transport_megaproject",
        "accelerate_research_programs": "fund_frontier_labs",
        "deepen_trade_corridors": "negotiate_trade_treaty",
        "form_multilateral_compacts": "join_regional_alliance",
        "fortify_resilience_systems": "harden_critical_infrastructure",
        "stabilize_internal_politics": "implement_institutional_reforms",
        "preserve_cultural_continuity": "expand_cultural_institutions",
        "repair_economic_foundations": "deploy_targeted_industrial_policy",
        "deescalate_regional_tensions": "open_diplomatic_backchannel",
        "maintain_strategic_balance": "maintain_status_quo",
    }
    actions: Dict[str, list[str]] = {}
    for civ_id, civ_objectives in objectives.items():
        actions[civ_id] = [action_map[objective] for objective in civ_objectives if objective in action_map]
    return actions


def _evaluate_strategic_outcomes(
    actions: Mapping[str, list[str]],
    civilizations: Iterable[Any],
    interciv: Mapping[str, Any],
) -> Dict[str, Dict[str, float]]:
    del civilizations
    del interciv
    outcomes: Dict[str, Dict[str, float]] = {}
    for civ_id, civ_actions in actions.items():
        diversity_bonus = clamp(len(set(civ_actions)) / 6.0)
        economic_impact = clamp(0.35 + diversity_bonus * 0.4)
        political_impact = clamp(0.3 + diversity_bonus * 0.45)
        cultural_impact = clamp(0.25 + (0.15 if "expand_cultural_institutions" in civ_actions else 0.0))
        technological_impact = clamp(0.25 + (0.25 if "fund_frontier_labs" in civ_actions else 0.0))
        diplomatic_impact = clamp(0.2 + (0.3 if "negotiate_trade_treaty" in civ_actions else 0.0))

        outcomes[civ_id] = {
            "economic_impact": round(economic_impact, 4),
            "political_impact": round(political_impact, 4),
            "cultural_impact": round(cultural_impact, 4),
            "technological_impact": round(technological_impact, 4),
            "diplomatic_impact": round(diplomatic_impact, 4),
            "composite": round(average([economic_impact, political_impact, cultural_impact, technological_impact, diplomatic_impact]), 4),
        }
    return outcomes


def _update_civilizational_identity_from_strategy(
    civilizations: Iterable[Any],
    outcomes: Mapping[str, Mapping[str, float]],
    history: Mapping[str, Any],
) -> None:
    del history
    for civ in civilizations:
        civ_id = as_id(civ)
        result = outcomes.get(civ_id, {})
        if not result:
            continue
        score = float(result.get("composite", 0.0))
        if isinstance(civ, dict):
            identity = civ.setdefault("identity", {})
            identity["strategy_confidence"] = round(score, 4)
            identity["alignment"] = "adaptive" if score >= 0.55 else "cautious"
