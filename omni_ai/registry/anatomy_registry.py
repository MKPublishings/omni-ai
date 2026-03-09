from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class AnatomyRegistry:
    head: Any
    torso: Any
    spine: Any | None = None
    _components: Dict[str, Any] = field(init=False, default_factory=dict)

    def __post_init__(self) -> None:
        self._components = {
            "head": self.head,
            "torso": self.torso,
        }
        if self.spine is not None:
            self._components["spine"] = self.spine

    def get(self, name: str) -> Any:
        return self._components.get(name)
