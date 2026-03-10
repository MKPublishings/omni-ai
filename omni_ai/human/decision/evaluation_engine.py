from __future__ import annotations

from typing import Dict, List


def evaluate_options(options: List[Dict[str, float | str]], expressed_traits: Dict[str, float]) -> List[Dict[str, float | str]]:
    motivation = expressed_traits.get("personality_motivation_drive", 0.5)
    emotional_reg = expressed_traits.get("personality_emotional_regulation", 0.5)

    scored: List[Dict[str, float | str]] = []
    for option in options:
        risk = float(option["risk"])
        confidence = float(option["confidence"])
        social_weight = float(option["social_weight"])
        score = max(0.0, min(1.0, (confidence * 0.4) + (social_weight * 0.2) + (motivation * 0.2) + ((1.0 - abs(risk - emotional_reg)) * 0.2)))
        enriched = dict(option)
        enriched["score"] = score
        scored.append(enriched)
    return scored
