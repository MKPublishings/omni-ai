from __future__ import annotations

from typing import Any, Dict, Iterable, Mapping

from ._utils import as_id, clamp, get_nested


def simulate_multicivilization_timelines(
    civilizations: Iterable[Any],
    interciv: Mapping[str, Any],
    history: Dict[str, Any],
    config: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    """Advance internal cycles, interactions, shocks, post-crisis effects, and long-term arcs."""
    config = config or {}
    civilizations = list(civilizations)

    internal = _advance_internal_timelines(civilizations, history, config)
    interactions = _simulate_intercivilizational_relations(civilizations, interciv, config)
    shocks = _generate_shared_or_localized_shocks(civilizations, config)
    postcrisis = _apply_post_crisis_evolution(civilizations, shocks, history, config)
    arcs = _update_long_term_arcs(civilizations, history, interactions, postcrisis)
    _record_timeline_events(history, arcs, interactions, shocks)

    return {
        "internal": internal,
        "interactions": interactions,
        "shocks": shocks,
        "postcrisis": postcrisis,
        "arcs": arcs,
    }


def _advance_internal_timelines(
    civilizations: Iterable[Any],
    history: Mapping[str, Any],
    config: Mapping[str, Any],
) -> Dict[str, Dict[str, Any]]:
    del history
    era_length = int(config.get("era_length", 25))
    current_year = int(config.get("year", 0))

    internal: Dict[str, Dict[str, Any]] = {}
    for civ in civilizations:
        civ_id = as_id(civ)
        stability = clamp(get_nested(civ, "institutions.cohesion", 0.5))
        innovation = clamp(get_nested(civ, "technology.level", 0.5))
        culture = clamp(get_nested(civ, "culture.unity", 0.5))

        epoch = "renaissance" if innovation > 0.7 and culture > 0.55 else "consolidation"
        if stability < 0.35:
            epoch = "fragmentation"

        internal[civ_id] = {
            "year": current_year,
            "era_window": era_length,
            "epoch": epoch,
            "stability": stability,
            "innovation": innovation,
        }
    return internal


def _simulate_intercivilizational_relations(
    civilizations: Iterable[Any],
    interciv: Mapping[str, Any],
    config: Mapping[str, Any],
) -> Dict[str, Any]:
    del civilizations
    del config
    return {
        "interaction_load": clamp(float(interciv.get("interaction_load", 0.5))),
        "cooperation_index": clamp(float(interciv.get("cooperation_index", 0.5))),
        "competition_index": clamp(float(interciv.get("competition_index", 0.4))),
    }


def _generate_shared_or_localized_shocks(
    civilizations: Iterable[Any],
    config: Mapping[str, Any],
) -> list[Dict[str, Any]]:
    baseline = clamp(float(config.get("shock_baseline", 0.35)))
    shared = clamp(float(config.get("shared_shock_factor", 0.25)))

    shocks: list[Dict[str, Any]] = []
    if shared >= 0.5:
        shocks.append({"scope": "shared", "type": "systemic_shock", "severity": shared})

    for civ in civilizations:
        vulnerability = clamp(get_nested(civ, "risks.total", baseline))
        if vulnerability > 0.6:
            shocks.append(
                {
                    "scope": "localized",
                    "civilization": as_id(civ),
                    "type": "localized_stress",
                    "severity": vulnerability,
                }
            )
    return shocks


def _apply_post_crisis_evolution(
    civilizations: Iterable[Any],
    shocks: Iterable[Mapping[str, Any]],
    history: Mapping[str, Any],
    config: Mapping[str, Any],
) -> Dict[str, Dict[str, Any]]:
    del history
    del config
    localized = {shock.get("civilization"): shock for shock in shocks if shock.get("scope") == "localized"}
    postcrisis: Dict[str, Dict[str, Any]] = {}

    for civ in civilizations:
        civ_id = as_id(civ)
        shock = localized.get(civ_id)
        if shock:
            severity = clamp(float(shock.get("severity", 0.0)))
            postcrisis[civ_id] = {
                "state": "restructuring",
                "recovery_index": round(clamp(1.0 - severity * 0.6), 4),
            }
        else:
            postcrisis[civ_id] = {"state": "stable", "recovery_index": 0.8}
    return postcrisis


def _update_long_term_arcs(
    civilizations: Iterable[Any],
    history: Mapping[str, Any],
    interactions: Mapping[str, Any],
    postcrisis: Mapping[str, Mapping[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    del history
    cooperation = float(interactions.get("cooperation_index", 0.5))
    competition = float(interactions.get("competition_index", 0.5))

    arcs: Dict[str, Dict[str, Any]] = {}
    for civ in civilizations:
        civ_id = as_id(civ)
        recovery = float(postcrisis.get(civ_id, {}).get("recovery_index", 0.5))
        if recovery >= 0.75 and cooperation >= competition:
            era = "cooperative_renewal"
        elif competition > cooperation and recovery >= 0.55:
            era = "strategic_contestation"
        elif recovery < 0.5:
            era = "protracted_recovery"
        else:
            era = "multipolar_transition"

        arcs[civ_id] = {"era": era, "recovery": round(recovery, 4)}
    return arcs


def _record_timeline_events(
    history: Dict[str, Any],
    arcs: Mapping[str, Mapping[str, Any]],
    interactions: Mapping[str, Any],
    shocks: Iterable[Mapping[str, Any]],
) -> None:
    events = history.setdefault("timeline_events", [])
    events.append(
        {
            "arcs": dict(arcs),
            "interactions": dict(interactions),
            "shock_count": len(list(shocks)),
        }
    )
