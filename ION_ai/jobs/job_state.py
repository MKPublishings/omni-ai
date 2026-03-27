from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class JobState:
    name: str
    completed: bool
    errors: List[str] = field(default_factory=list)
    artifacts: List[str] = field(default_factory=list)
