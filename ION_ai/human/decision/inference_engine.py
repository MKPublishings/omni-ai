from __future__ import annotations

from typing import Dict


def infer_state(perception: Dict[str, float | str], expressed_traits: Dict[str, float]) -> Dict[str, float]:
    working_memory = expressed_traits.get("cognitive_working_memory", 0.5)
    reasoning = expressed_traits.get("cognitive_reasoning_style", 0.5)
    signal_quality = float(perception.get("signal_quality", 0.5))

    inferred_confidence = max(0.0, min(1.0, (working_memory * 0.45) + (reasoning * 0.35) + (signal_quality * 0.2)))
    uncertainty = max(0.0, min(1.0, 1.0 - inferred_confidence))
    return {"inferred_confidence": inferred_confidence, "uncertainty": uncertainty}
