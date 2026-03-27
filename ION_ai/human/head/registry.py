from __future__ import annotations

from typing import Any, Dict

from ION_ai.human.head.brain.regions import BRAIN_REGIONS
from ION_ai.human.head.glands import ALL_GLANDS
from ION_ai.human.head.muscles import ALL_MUSCLES
from ION_ai.human.head.nerves.cranial import CRANIAL_NERVES
from ION_ai.human.head.senses import ALL_ORGANS
from ION_ai.human.head.skeletal.bones import SKULL_BONES
from ION_ai.human.head.vascular import ALL_VESSELS


def _nerve_aliases() -> Dict[str, Any]:
    aliases: Dict[str, Any] = {}
    for number, nerve in CRANIAL_NERVES.items():
        aliases[str(number)] = nerve
        aliases[f"cranial_nerve_{number}"] = nerve
        aliases[f"{nerve.name.lower().replace(' ', '_').replace('-', '_')}_nerve"] = nerve
    return aliases


# Non-dataclass structures used by integration graphs and traces.
GRAPH_STRUCTURES: Dict[str, Dict[str, str]] = {
    "teeth": {"id": "teeth", "name": "Teeth", "type": "Structure"},
    "larynx": {"id": "larynx", "name": "Larynx", "type": "Structure"},
    "pharynx": {"id": "pharynx", "name": "Pharynx", "type": "Structure"},
    "pharyngeal_constrictors": {
        "id": "pharyngeal_constrictors",
        "name": "Pharyngeal Constrictors",
        "type": "MuscleGroup",
    },
}


HEAD_REGISTRY: Dict[str, Any] = {
    **BRAIN_REGIONS,
    **_nerve_aliases(),
    **SKULL_BONES,
    **ALL_MUSCLES,
    **ALL_ORGANS,
    **ALL_VESSELS,
    **ALL_GLANDS,
    **GRAPH_STRUCTURES,
}
