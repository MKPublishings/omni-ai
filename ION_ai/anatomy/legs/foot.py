from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping

from .toe import Toe


def _default_toes() -> dict[str, Toe]:
    return {
        "hallux": Toe(name="hallux"),
        "second": Toe(name="second"),
        "third": Toe(name="third"),
        "fourth": Toe(name="fourth"),
        "fifth": Toe(name="fifth"),
    }


@dataclass
class Foot:
    name: str = "foot"
    arch_height: float = 3.0
    toes: dict[str, Toe] = field(default_factory=_default_toes)

    def pressure_distribution(self, load: float) -> dict[str, float]:
        return {
            "heel": load * 0.5,
            "midfoot": load * 0.3,
            "forefoot": load * 0.2,
        }

    def articulate_toes(self, commands: Mapping[str, Mapping[str, float]]) -> dict[str, Toe]:
        for toe_name, values in commands.items():
            if toe_name not in self.toes:
                continue
            self.toes[toe_name].articulate(
                flexion=float(values.get("flexion", self.toes[toe_name].flexion)),
                extension=float(values.get("extension", self.toes[toe_name].extension)),
            )
        return self.toes
