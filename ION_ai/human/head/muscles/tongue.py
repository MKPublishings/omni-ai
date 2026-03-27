from __future__ import annotations

from typing import Dict

from ION_ai.human.head.models import Muscle

TONGUE_MUSCLES: Dict[str, Muscle] = {
    "genioglossus": Muscle(
        id="genioglossus",
        name="Genioglossus",
        group="tongue",
        actions=["protrude tongue"],
        innervation=[12],
    ),
    "hyoglossus": Muscle(
        id="hyoglossus",
        name="Hyoglossus",
        group="tongue",
        actions=["depress tongue"],
        innervation=[12],
    ),
    "styloglossus": Muscle(
        id="styloglossus",
        name="Styloglossus",
        group="tongue",
        actions=["retract and elevate tongue"],
        innervation=[12],
    ),
}
