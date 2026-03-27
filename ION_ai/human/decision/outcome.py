from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DecisionOutcome:
    agent_id: str
    confidence: float
    predicted_probability: float
    selected_option: str
    objective: str
