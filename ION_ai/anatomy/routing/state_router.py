from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass
class StateRouter:
    def merge(
        self,
        head_state: Any,
        torso_state: Any,
        arm_state: Any,
        leg_state: Any,
        spine_state: Any,
    ) -> Mapping[str, Any]:
        return {
            "head": head_state,
            "torso": torso_state,
            "arms": arm_state,
            "legs": leg_state,
            "spine": spine_state,
        }
