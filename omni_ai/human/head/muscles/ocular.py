from __future__ import annotations

from typing import Dict

from omni_ai.human.head.models import Muscle

OCULAR_MUSCLES: Dict[str, Muscle] = {
    "superior_rectus": Muscle(id="superior_rectus", name="Superior Rectus", group="ocular", actions=["elevate eye"], innervation=[3]),
    "inferior_rectus": Muscle(id="inferior_rectus", name="Inferior Rectus", group="ocular", actions=["depress eye"], innervation=[3]),
    "medial_rectus": Muscle(id="medial_rectus", name="Medial Rectus", group="ocular", actions=["adduct eye"], innervation=[3]),
    "lateral_rectus": Muscle(id="lateral_rectus", name="Lateral Rectus", group="ocular", actions=["abduct eye"], innervation=[6]),
    "superior_oblique": Muscle(id="superior_oblique", name="Superior Oblique", group="ocular", actions=["intort and depress eye"], innervation=[4]),
    "inferior_oblique": Muscle(id="inferior_oblique", name="Inferior Oblique", group="ocular", actions=["extort and elevate eye"], innervation=[3]),
}
