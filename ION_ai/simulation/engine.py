from __future__ import annotations

from typing import Any, Dict, Iterable, Mapping

from ._utils import as_id, average, clamp, get_nested
from .existential import simulate_existential_risks
from .grand_strategy import simulate_grand_strategy
from .intercivilizational import simulate_intercivilizational_dynamics
from .megaprojects import simulate_megaprojects
from .post_crisis import simulate_post_crisis_evolution
from .timelines import simulate_multicivilization_timelines


def run_simulation_tick(
    civilizations: Iterable[Any],
    history: Dict[str, Any] | None = None,
    config: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    """Run one orchestrated simulation tick across all high-level civilization layers."""
    config = config or {}
    history = history if history is not None else {}
    civilizations = list(civilizations)

    interciv_config = config.get("intercivilizational", {})
    strategy_config = config.get("grand_strategy", {})
    mega_config = config.get("megaprojects", {})
    existential_config = config.get("existential", {})
    post_config = config.get("post_crisis", {})
    timeline_config = config.get("timelines", {})

    interciv = simulate_intercivilizational_dynamics(civilizations, interciv_config)
    strategy = simulate_grand_strategy(civilizations, interciv, history=history, config=strategy_config)

    global_tension = _global_tension_from_interciv(interciv)
    megaprojects_by_civ = _run_megaprojects(civilizations, interciv, mega_config)

    existential = simulate_existential_risks(
        civilizations=civilizations,
        megaprojects=megaprojects_by_civ,
        interciv={"global_tension": global_tension},
        history=history,
        config=existential_config,
    )

    post_crisis = _run_post_crisis(civilizations, existential, history, post_config)

    timeline_interciv = {
        "interaction_load": clamp(average([global_tension, 1.0 - global_tension])),
        "cooperation_index": clamp(average([1.0 - global_tension, 0.5])),
        "competition_index": clamp(average([global_tension, 0.4])),
    }
    timelines = simulate_multicivilization_timelines(
        civilizations=civilizations,
        interciv=timeline_interciv,
        history=history,
        config=timeline_config,
    )

    return {
        "intercivilizational": interciv,
        "grand_strategy": strategy,
        "megaprojects": megaprojects_by_civ,
        "existential": existential,
        "post_crisis": post_crisis,
        "timelines": timelines,
    }


class SimulationEngine:
    """Stateful orchestrator for running repeated simulation ticks."""

    def __init__(
        self,
        civilizations: Iterable[Any],
        history: Dict[str, Any] | None = None,
        config: Mapping[str, Any] | None = None,
    ) -> None:
        self.civilizations = list(civilizations)
        self.history = history if history is not None else {}
        self.config = dict(config or {})
        self.tick_count = 0
        self.last_tick: Dict[str, Any] | None = None

    def step(self) -> Dict[str, Any]:
        """Advance the engine by one tick and return the composite output."""
        result = run_simulation_tick(self.civilizations, self.history, self.config)
        pulse = _compute_engine_pulse(result)
        subsystem_trace = {
            "tick": self.tick_count + 1,
            "intercivilizational": {
                "pair_count": len(result.get("intercivilizational", {}).get("interactions", [])),
                "event_count": len(result.get("intercivilizational", {}).get("events", [])),
            },
            "grand_strategy": {
                "civilization_count": len(result.get("grand_strategy", {}).get("posture", {})),
                "mean_composite": pulse["strategy_score"],
            },
        }

        self.history.setdefault("engine_pulse", []).append(pulse)
        self.history.setdefault("subsystem_trace", []).append(subsystem_trace)
        result["pulse"] = pulse
        result["subsystem_trace"] = subsystem_trace

        self.tick_count += 1
        self.last_tick = result
        return result


def _compute_engine_pulse(result: Mapping[str, Any]) -> Dict[str, float]:
    interciv = result.get("intercivilizational", {}) if isinstance(result, Mapping) else {}
    strategy = result.get("grand_strategy", {}) if isinstance(result, Mapping) else {}

    outcomes = interciv.get("outcomes", {}) if isinstance(interciv, Mapping) else {}
    tensions = []
    cooperations = []
    if isinstance(outcomes, Mapping):
        for metrics in outcomes.values():
            if isinstance(metrics, Mapping):
                tensions.append(float(metrics.get("tension", 0.0)))
                cooperations.append(float(metrics.get("cooperation", 0.0)))

    strategy_outcomes = strategy.get("outcomes", {}) if isinstance(strategy, Mapping) else {}
    composites = []
    if isinstance(strategy_outcomes, Mapping):
        for metrics in strategy_outcomes.values():
            if isinstance(metrics, Mapping):
                composites.append(float(metrics.get("composite", 0.0)))

    mean_tension = clamp(average(tensions, fallback=0.0))
    mean_cooperation = clamp(average(cooperations, fallback=0.0))
    strategy_score = clamp(average(composites, fallback=0.0))
    vitality = clamp(average([mean_cooperation, 1.0 - mean_tension, strategy_score]))

    return {
        "tension": round(mean_tension, 4),
        "cooperation": round(mean_cooperation, 4),
        "strategy_score": round(strategy_score, 4),
        "vitality": round(vitality, 4),
    }


def _global_tension_from_interciv(interciv: Mapping[str, Any]) -> float:
    outcomes = interciv.get("outcomes", {}) if isinstance(interciv, Mapping) else {}
    if not isinstance(outcomes, Mapping) or not outcomes:
        return 0.4

    tensions = []
    for metrics in outcomes.values():
        if isinstance(metrics, Mapping):
            tensions.append(float(metrics.get("tension", 0.0)))
    return clamp(average(tensions, fallback=0.4))


def _run_megaprojects(
    civilizations: Iterable[Any],
    interciv: Mapping[str, Any],
    config: Mapping[str, Any],
) -> Dict[str, Dict[str, Any]]:
    outcomes = interciv.get("outcomes", {}) if isinstance(interciv, Mapping) else {}
    results: Dict[str, Dict[str, Any]] = {}

    for civ in civilizations:
        civ_id = as_id(civ)
        civ_outcome = outcomes.get(civ_id, {}) if isinstance(outcomes, Mapping) else {}
        competition_pressure = clamp(float(civ_outcome.get("tension", 0.35)))

        economy = _extract_map(civ, "economy")
        culture = _extract_map(civ, "culture")
        politics = _extract_map(civ, "institutions")

        if "capacity" not in economy:
            economy["capacity"] = clamp(average([economy.get("stability", 0.5), economy.get("trade_openness", 0.5)]))
        if "build_speed" not in economy:
            economy["build_speed"] = 0.55
        if "infrastructure_strain" not in economy:
            economy["infrastructure_strain"] = clamp(1.0 - float(economy.get("stability", 0.5)))
        if "energy_pressure" not in economy:
            economy["energy_pressure"] = 0.5

        mega_politics = {
            "coalition_pressure": clamp(1.0 - float(politics.get("cohesion", 0.5))),
            "support": clamp(float(politics.get("cohesion", 0.5))),
            "execution": clamp(float(politics.get("cohesion", 0.5))),
        }
        mega_culture = {"alignment": clamp(float(culture.get("unity", 0.5)))}

        results[civ_id] = simulate_megaprojects(
            civilization=_as_map(civ),
            interciv={"competition_pressure": competition_pressure},
            economy=economy,
            culture=mega_culture,
            politics=mega_politics,
            config=config,
        )

    return results


def _run_post_crisis(
    civilizations: Iterable[Any],
    existential: Mapping[str, Any],
    history: Dict[str, Any],
    config: Mapping[str, Any],
) -> Dict[str, Dict[str, Any]]:
    crises = existential.get("crises", []) if isinstance(existential, Mapping) else []
    crises_by_civ: Dict[str, Dict[str, Any]] = {}

    for crisis in crises:
        if not isinstance(crisis, Mapping):
            continue
        civ_id = str(crisis.get("civilization", "unknown"))
        severity = clamp(float(crisis.get("severity", 0.0)))
        current = crises_by_civ.get(civ_id)
        if current is None or severity > float(current.get("severity", 0.0)):
            crises_by_civ[civ_id] = {"severity": severity, "risk_type": crisis.get("risk_type", "unknown")}

    results: Dict[str, Dict[str, Any]] = {}
    for civ in civilizations:
        civ_id = as_id(civ)
        civ_map = _as_map(civ)
        crisis = crises_by_civ.get(civ_id, {"severity": 0.0, "risk_type": "none"})

        economy = _extract_map(civ, "economy")
        politics = _extract_map(civ, "institutions")
        culture = _extract_map(civ, "culture")

        post_politics = {
            "fragility": clamp(1.0 - float(politics.get("cohesion", 0.5))),
            "triage_capacity": clamp(float(politics.get("cohesion", 0.5))),
            "reform_capacity": clamp(float(politics.get("cohesion", 0.5))),
        }
        post_economy = {
            "fragility": clamp(1.0 - float(economy.get("stability", 0.5))),
            "adaptability": clamp(float(economy.get("stability", 0.5))),
        }
        post_culture = {"adaptability": clamp(float(culture.get("unity", 0.5)))}

        results[civ_id] = simulate_post_crisis_evolution(
            civilization=civ_map,
            crisis=crisis,
            history=history,
            economy=post_economy,
            culture=post_culture,
            politics=post_politics,
            config=config,
        )

    return results


def _extract_map(source: Any, key: str) -> Dict[str, Any]:
    if isinstance(source, Mapping):
        value = source.get(key, {})
    else:
        value = getattr(source, key, {})
    if isinstance(value, Mapping):
        return dict(value)
    return {}


def _as_map(source: Any) -> Dict[str, Any]:
    if isinstance(source, Mapping):
        return dict(source)
    return {
        "id": as_id(source),
        "economy": _extract_map(source, "economy"),
        "culture": _extract_map(source, "culture"),
        "institutions": _extract_map(source, "institutions"),
        "technology": {"level": get_nested(source, "technology.level", 0.5)},
        "vulnerability": _extract_map(source, "vulnerability"),
    }
