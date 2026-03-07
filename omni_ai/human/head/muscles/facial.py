from __future__ import annotations

from typing import Dict

from omni_ai.human.head.models import Muscle

FACIAL_MUSCLES: Dict[str, Muscle] = {
    "orbicularis_oculi": Muscle(
        id="orbicularis_oculi",
        name="Orbicularis Oculi",
        group="facial_expression",
        actions=["close eyelids"],
        innervation=[7],
    ),
    "zygomaticus_major": Muscle(
        id="zygomaticus_major",
        name="Zygomaticus Major",
        group="facial_expression",
        actions=["elevate mouth corners"],
        innervation=[7],
    ),
    "orbicularis_oris": Muscle(
        id="orbicularis_oris",
        name="Orbicularis Oris",
        group="facial_expression",
        actions=["close and protrude lips"],
        innervation=[7],
    ),
    "buccinator": Muscle(
        id="buccinator",
        name="Buccinator",
        group="facial_expression",
        actions=["compress cheek"],
        innervation=[7],
    ),
    "frontalis": Muscle(
        id="frontalis",
        name="Frontalis",
        group="facial_expression",
        actions=["raise eyebrows", "wrinkle forehead"],
        innervation=[7],
    ),
    "corrugator_supercilii": Muscle(
        id="corrugator_supercilii",
        name="Corrugator Supercilii",
        group="facial_expression",
        actions=["draw eyebrows medially", "frown"],
        innervation=[7],
    ),
}
