from __future__ import annotations

from typing import Dict

from omni_ai.human.head.models import Muscle

MASTICATION_MUSCLES: Dict[str, Muscle] = {
    "masseter": Muscle(
        id="masseter",
        name="Masseter",
        group="mastication",
        actions=["elevate mandible"],
        innervation=[5],
    ),
    "temporalis": Muscle(
        id="temporalis",
        name="Temporalis",
        group="mastication",
        actions=["elevate and retract mandible"],
        innervation=[5],
    ),
    "medial_pterygoid": Muscle(
        id="medial_pterygoid",
        name="Medial Pterygoid",
        group="mastication",
        actions=["elevate mandible", "grinding"],
        innervation=[5],
    ),
    "lateral_pterygoid": Muscle(
        id="lateral_pterygoid",
        name="Lateral Pterygoid",
        group="mastication",
        actions=["protract mandible", "depress mandible"],
        innervation=[5],
    ),
}
