from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict


@dataclass
class Scenario:
    context_type: str
    complexity: float
    objective: str
    time_horizon: str = "short"
    variables: Dict[str, float] = field(default_factory=dict)

    def normalized_complexity(self) -> float:
        return max(0.0, min(1.0, self.complexity))
