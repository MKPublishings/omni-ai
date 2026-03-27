from __future__ import annotations

from typing import Dict

from ION_ai.human.neck.models import NeckStructure

CERVICAL_STRUCTURES: Dict[str, NeckStructure] = {
    "c1_atlas": NeckStructure(
        id="c1_atlas",
        name="Atlas (C1)",
        category="bone",
        connections=["occipital", "c2_axis"],
    ),
    "c2_axis": NeckStructure(
        id="c2_axis",
        name="Axis (C2)",
        category="bone",
        connections=["c1_atlas", "c3_cervical"],
    ),
    "c3_cervical": NeckStructure(
        id="c3_cervical",
        name="C3 Vertebra",
        category="bone",
        connections=["c2_axis", "c4_cervical"],
    ),
    "c4_cervical": NeckStructure(
        id="c4_cervical",
        name="C4 Vertebra",
        category="bone",
        connections=["c3_cervical", "c5_cervical"],
    ),
    "c5_cervical": NeckStructure(
        id="c5_cervical",
        name="C5 Vertebra",
        category="bone",
        connections=["c4_cervical", "c6_cervical"],
    ),
    "c6_cervical": NeckStructure(
        id="c6_cervical",
        name="C6 Vertebra",
        category="bone",
        connections=["c5_cervical", "c7_cervical"],
    ),
    "c7_cervical": NeckStructure(
        id="c7_cervical",
        name="C7 Vertebra",
        category="bone",
        connections=["c6_cervical", "thoracic_inlet"],
    ),
    "hyoid": NeckStructure(
        id="hyoid",
        name="Hyoid Bone",
        category="support",
        connections=["mandible", "pharynx"],
    ),
    "thoracic_inlet": NeckStructure(
        id="thoracic_inlet",
        name="Thoracic Inlet",
        category="region",
        connections=["c7_cervical"],
    ),
}
