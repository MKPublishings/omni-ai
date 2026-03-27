from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, Mapping

from .job_state import JobState


@dataclass
class SowingRunner:
    tasks: Mapping[str, Callable[[], JobState]]

    def run(self) -> Dict[str, JobState]:
        return {name: task() for name, task in self.tasks.items()}
