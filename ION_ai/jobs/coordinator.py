from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Mapping

from .runner import SowingRunner
from .torso_manifest import TORSO_SOWING_TASKS


@dataclass
class TorsoSowingCoordinator:
    runner: SowingRunner = field(default_factory=lambda: SowingRunner(TORSO_SOWING_TASKS))

    def execute(self) -> Mapping[str, object]:
        results = self.runner.run()
        completed = all(state.completed for state in results.values())
        errors: Dict[str, List[str]] = {name: state.errors for name, state in results.items() if state.errors}
        artifacts = {name: state.artifacts for name, state in results.items()}
        return {
            "completed": completed,
            "errors": errors,
            "artifacts": artifacts,
        }
