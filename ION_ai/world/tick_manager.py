from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(slots=True)
class TickRecord:
    tick: int
    reason: str


class TickManager:
    def __init__(self) -> None:
        self._tick = 0
        self._history: List[TickRecord] = []

    @property
    def current_tick(self) -> int:
        return self._tick

    def advance(self, steps: int = 1, reason: str = "manual") -> int:
        bounded_steps = max(1, int(steps))
        for _ in range(bounded_steps):
            self._tick += 1
            self._history.append(TickRecord(tick=self._tick, reason=reason))
        return self._tick

    def get_history(self) -> List[TickRecord]:
        return list(self._history)