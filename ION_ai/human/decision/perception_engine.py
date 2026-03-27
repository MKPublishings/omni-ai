from __future__ import annotations

from typing import Dict

from ..scenario import Scenario


def perceive_scenario(scenario: Scenario, expressed_traits: Dict[str, float]) -> Dict[str, float | str]:
    attention = expressed_traits.get("cognitive_attention_control", 0.5)
    signal_quality = max(0.0, min(1.0, 0.5 + ((attention - 0.5) * 0.6) - (scenario.normalized_complexity() * 0.2)))
    return {
        "context_type": scenario.context_type,
        "complexity": scenario.normalized_complexity(),
        "signal_quality": signal_quality,
    }
