from __future__ import annotations

from typing import Dict

from ION_ai.human.neck.models import NeckMuscle

NECK_MUSCLES: Dict[str, NeckMuscle] = {
    "sternocleidomastoid": NeckMuscle(
        id="sternocleidomastoid",
        name="Sternocleidomastoid",
        actions=["neck flexion", "head rotation"],
        innervation=["accessory_nerve", "cervical_plexus"],
        connections=["occipital", "thoracic_inlet"],
    ),
    "scalenes": NeckMuscle(
        id="scalenes",
        name="Scalene Group",
        actions=["neck lateral flexion", "elevate first ribs"],
        innervation=["cervical_plexus"],
        connections=["c3_cervical", "c7_cervical", "thoracic_inlet"],
    ),
    "suprahyoid_group": NeckMuscle(
        id="suprahyoid_group",
        name="Suprahyoid Group",
        actions=["elevate hyoid", "assist swallowing"],
        innervation=["facial_nerve", "trigeminal_nerve", "hypoglossal_nerve"],
        connections=["hyoid", "mandible", "pharynx"],
    ),
    "infrahyoid_group": NeckMuscle(
        id="infrahyoid_group",
        name="Infrahyoid Group",
        actions=["depress hyoid", "stabilize larynx"],
        innervation=["cervical_plexus"],
        connections=["hyoid", "larynx", "thoracic_inlet"],
    ),
}
