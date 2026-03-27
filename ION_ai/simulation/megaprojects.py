from __future__ import annotations

from typing import Any, Dict, Mapping

from ._utils import average, clamp, get_nested


def simulate_megaprojects(
    civilization: Mapping[str, Any],
    interciv: Mapping[str, Any],
    economy: Mapping[str, Any],
    culture: Mapping[str, Any],
    politics: Mapping[str, Any],
    config: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    """Model one civilization's megaproject pipeline for the current strategic cycle."""
    config = config or {}
    needs = _identify_strategic_needs(civilization, economy, politics, interciv)
    candidates = _generate_megaproject_candidates(needs, civilization, config)
    feasibility = _evaluate_megaproject_feasibility(candidates, civilization, economy, politics, culture)
    selected = _select_megaproject(feasibility, politics, culture)
    progress = _simulate_megaproject_construction(selected, economy, politics, config)
    effects = _apply_megaproject_effects(selected, civilization, interciv, economy, culture)
    return {
        "needs": needs,
        "candidates": candidates,
        "selected": selected,
        "progress": progress,
        "effects": effects,
    }


def _identify_strategic_needs(
    civilization: Mapping[str, Any],
    economy: Mapping[str, Any],
    politics: Mapping[str, Any],
    interciv: Mapping[str, Any],
) -> Dict[str, float]:
    return {
        "infrastructure_strain": clamp(get_nested(economy, "infrastructure_strain", 0.5)),
        "energy_pressure": clamp(get_nested(economy, "energy_pressure", 0.5)),
        "political_pressure": clamp(get_nested(politics, "coalition_pressure", 0.5)),
        "intercivilizational_competition": clamp(get_nested(interciv, "competition_pressure", 0.4)),
        "cultural_aspiration": clamp(get_nested(civilization, "culture.aspirational_intensity", 0.5)),
    }


def _generate_megaproject_candidates(
    needs: Mapping[str, float],
    civilization: Mapping[str, Any],
    config: Mapping[str, Any],
) -> list[Dict[str, Any]]:
    del civilization
    del config
    templates = [
        ("continental_rail_grid", "transport", needs["infrastructure_strain"]),
        ("fusion_megacomplex", "energy", needs["energy_pressure"]),
        ("climate_stabilization_network", "environment", average([needs["energy_pressure"], needs["cultural_aspiration"]])),
        ("orbital_launch_network", "space", needs["intercivilizational_competition"]),
        ("global_knowledge_backbone", "knowledge", needs["cultural_aspiration"]),
    ]
    return [
        {
            "name": name,
            "domain": domain,
            "priority": round(clamp(priority), 4),
        }
        for name, domain, priority in templates
    ]


def _evaluate_megaproject_feasibility(
    candidates: list[Dict[str, Any]],
    civilization: Mapping[str, Any],
    economy: Mapping[str, Any],
    politics: Mapping[str, Any],
    culture: Mapping[str, Any],
) -> list[Dict[str, Any]]:
    budget = clamp(get_nested(economy, "capacity", 0.5))
    support = clamp(get_nested(politics, "support", 0.5))
    alignment = clamp(get_nested(culture, "alignment", 0.5))
    readiness = clamp(get_nested(civilization, "technology.level", 0.5))

    scored: list[Dict[str, Any]] = []
    for candidate in candidates:
        score = average([candidate["priority"], budget, support, alignment, readiness])
        scored.append({**candidate, "feasibility": round(clamp(score), 4)})
    return scored


def _select_megaproject(feasibility: list[Dict[str, Any]], politics: Mapping[str, Any], culture: Mapping[str, Any]) -> Dict[str, Any]:
    del politics
    del culture
    if not feasibility:
        return {"name": None, "domain": "none", "feasibility": 0.0}
    return max(feasibility, key=lambda item: float(item.get("feasibility", 0.0)))


def _simulate_megaproject_construction(
    selected: Mapping[str, Any],
    economy: Mapping[str, Any],
    politics: Mapping[str, Any],
    config: Mapping[str, Any],
) -> Dict[str, Any]:
    if not selected or not selected.get("name"):
        return {"status": "idle", "completion": 0.0, "delay_risk": 0.0}

    base_speed = clamp(get_nested(economy, "build_speed", 0.5))
    governance_efficiency = clamp(get_nested(politics, "execution", 0.5))
    time_pressure = clamp(float(config.get("time_pressure", 0.4)))

    completion = clamp(average([base_speed, governance_efficiency, float(selected.get("feasibility", 0.0))]) * (1.0 - time_pressure * 0.3))
    delay_risk = clamp(1.0 - average([base_speed, governance_efficiency]))

    return {
        "status": "active",
        "completion": round(completion, 4),
        "delay_risk": round(delay_risk, 4),
    }


def _apply_megaproject_effects(
    selected: Mapping[str, Any],
    civilization: Mapping[str, Any],
    interciv: Mapping[str, Any],
    economy: Mapping[str, Any],
    culture: Mapping[str, Any],
) -> Dict[str, float]:
    del civilization
    del interciv
    del economy
    del culture

    if not selected or not selected.get("name"):
        return {
            "transportation_networks": 0.0,
            "economic_output": 0.0,
            "cultural_identity": 0.0,
            "political_legitimacy": 0.0,
            "intercivilizational_posture": 0.0,
        }

    domain = str(selected.get("domain", "none"))
    domain_boosts = {
        "transport": (0.3, 0.25, 0.1, 0.15, 0.2),
        "energy": (0.15, 0.3, 0.08, 0.18, 0.15),
        "environment": (0.12, 0.2, 0.2, 0.2, 0.1),
        "space": (0.1, 0.2, 0.18, 0.15, 0.3),
        "knowledge": (0.1, 0.18, 0.25, 0.12, 0.15),
    }
    values = domain_boosts.get(domain, (0.1, 0.1, 0.1, 0.1, 0.1))
    return {
        "transportation_networks": values[0],
        "economic_output": values[1],
        "cultural_identity": values[2],
        "political_legitimacy": values[3],
        "intercivilizational_posture": values[4],
    }
