from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping

from ._utils import as_id, average, clamp
from .interaction_vectors import compute_interaction_vectors


def simulate_intercivilizational_dynamics(civilizations: Iterable[Any], config: Mapping[str, Any] | None = None) -> Dict[str, Any]:
    """Simulate network-level dynamics across multiple civilizations."""
    config = config or {}
    civilizations = list(civilizations)
    interaction_vectors = _compute_interaction_vectors(civilizations, config)
    events = _generate_intercivilizational_events(civilizations, interaction_vectors, config)
    outcomes = _resolve_intercivilizational_interactions(civilizations, events, config)
    arcs = _update_civilizational_arcs(civilizations, outcomes, config)
    return {
        "interactions": interaction_vectors,
        "events": events,
        "outcomes": outcomes,
        "arcs": arcs,
    }


def _compute_interaction_vectors(civilizations: List[Any], config: Mapping[str, Any]) -> List[Dict[str, Any]]:
    return compute_interaction_vectors(civilizations, config)


def _generate_intercivilizational_events(
    civilizations: List[Any],
    interaction_vectors: List[Dict[str, Any]],
    config: Mapping[str, Any],
) -> List[Dict[str, Any]]:
    del civilizations
    events: List[Dict[str, Any]] = []
    cooperation_bias = float(config.get("cooperation_bias", 0.0))
    thresholds = _event_thresholds(config)

    for vector in interaction_vectors:
        pair = vector["pair"]
        cooperative_pressure = average(
            [
                vector["trade_flows"],
                vector["diplomatic_ties"],
                vector["cultural_compatibility"],
            ]
        ) + cooperation_bias

        tension_pressure = average(
            [
                vector["technological_asymmetry"],
                1.0 - vector["diplomatic_ties"],
            ]
        )

        if cooperative_pressure >= thresholds["treaty"]:
            events.append({"type": "treaty", "pair": pair, "intensity": clamp(cooperative_pressure)})
        if vector["trade_flows"] >= thresholds["trade_agreement"]:
            events.append({"type": "trade_agreement", "pair": pair, "intensity": clamp(vector["trade_flows"])})
        if (
            vector["cultural_compatibility"] >= thresholds["cultural_exchange_culture"]
            and vector["transportation_connectivity"] >= thresholds["cultural_exchange_transport"]
        ):
            events.append({"type": "cultural_exchange", "pair": pair, "intensity": clamp(vector["cultural_compatibility"])})
        if tension_pressure >= thresholds["dispute"]:
            events.append({"type": "dispute", "pair": pair, "intensity": clamp(tension_pressure)})
        if vector["technological_asymmetry"] >= thresholds["innovation_race"]:
            events.append(
                {
                    "type": "innovation_race",
                    "pair": pair,
                    "intensity": clamp(vector["technological_asymmetry"]),
                }
            )

    return events


def _event_thresholds(config: Mapping[str, Any]) -> Dict[str, float]:
    defaults: Dict[str, float] = {
        "treaty": 0.6,
        "trade_agreement": 0.0,
        "cultural_exchange_culture": 0.65,
        "cultural_exchange_transport": 0.35,
        "dispute": 0.55,
        "innovation_race": 0.5,
    }
    raw_thresholds = config.get("event_thresholds", {}) if isinstance(config, Mapping) else {}
    if not isinstance(raw_thresholds, Mapping):
        return defaults

    thresholds: Dict[str, float] = {}
    for key, fallback in defaults.items():
        raw_value = raw_thresholds.get(key, fallback)
        try:
            thresholds[key] = clamp(float(raw_value))
        except (TypeError, ValueError):
            thresholds[key] = fallback
    return thresholds


def _resolve_intercivilizational_interactions(
    civilizations: List[Any],
    events: List[Dict[str, Any]],
    config: Mapping[str, Any],
) -> Dict[str, Dict[str, float]]:
    del config
    outcomes: Dict[str, Dict[str, float]] = {
        as_id(civ): {"cooperation": 0.0, "tension": 0.0, "innovation": 0.0} for civ in civilizations
    }

    for event in events:
        civ_a, civ_b = event["pair"]
        event_type = event["type"]
        intensity = float(event.get("intensity", 0.0))

        if event_type in {"treaty", "trade_agreement", "cultural_exchange"}:
            outcomes[civ_a]["cooperation"] += intensity
            outcomes[civ_b]["cooperation"] += intensity
        if event_type == "dispute":
            outcomes[civ_a]["tension"] += intensity
            outcomes[civ_b]["tension"] += intensity
        if event_type == "innovation_race":
            outcomes[civ_a]["innovation"] += intensity
            outcomes[civ_b]["innovation"] += intensity

    for metrics in outcomes.values():
        for key, value in metrics.items():
            metrics[key] = round(clamp(value / 3.0), 4)

    return outcomes


def _update_civilizational_arcs(
    civilizations: List[Any],
    outcomes: Dict[str, Dict[str, float]],
    config: Mapping[str, Any],
) -> Dict[str, Dict[str, Any]]:
    del config
    arcs: Dict[str, Dict[str, Any]] = {}
    for civ in civilizations:
        civ_id = as_id(civ)
        metrics = outcomes.get(civ_id, {"cooperation": 0.0, "tension": 0.0, "innovation": 0.0})

        if metrics["cooperation"] >= 0.55 and metrics["tension"] < 0.35:
            phase = "cooperative_age"
        elif metrics["tension"] >= 0.55:
            phase = "rivalry_cycle"
        elif metrics["innovation"] >= 0.45:
            phase = "innovation_contestation"
        else:
            phase = "multipolar_balance"

        arcs[civ_id] = {
            "phase": phase,
            "signals": metrics,
        }
    return arcs
