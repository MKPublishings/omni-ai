from __future__ import annotations

from typing import Dict, List


def generate_options(inference: Dict[str, float], expressed_traits: Dict[str, float]) -> List[Dict[str, float | str]]:
    risk = expressed_traits.get("cognitive_risk_evaluation", 0.5)
    coop = expressed_traits.get("personality_cooperation", 0.5)
    base_conf = inference.get("inferred_confidence", 0.5)

    return [
        {"label": "conservative", "risk": max(0.0, risk - 0.25), "social_weight": coop, "confidence": base_conf},
        {"label": "balanced", "risk": risk, "social_weight": coop, "confidence": base_conf},
        {"label": "exploratory", "risk": min(1.0, risk + 0.25), "social_weight": max(0.0, coop - 0.1), "confidence": base_conf},
    ]
