from __future__ import annotations

from typing import Dict

from omni_ai.human.neck.models import NeckNerve

NECK_NERVES: Dict[str, NeckNerve] = {
    "cervical_plexus": NeckNerve(
        id="cervical_plexus",
        name="Cervical Plexus",
        roots=["C1", "C2", "C3", "C4"],
        functions=["neck sensation", "infrahyoid motor relay", "diaphragm assist"],
        targets=["sternocleidomastoid", "scalenes", "infrahyoid_group", "c3_cervical", "c4_cervical"],
    ),
    "ansa_cervicalis": NeckNerve(
        id="ansa_cervicalis",
        name="Ansa Cervicalis",
        roots=["C1", "C2", "C3"],
        functions=["infrahyoid coordination"],
        targets=["infrahyoid_group", "hyoid", "larynx"],
    ),
    "phrenic_nerve": NeckNerve(
        id="phrenic_nerve",
        name="Phrenic Nerve",
        roots=["C3", "C4", "C5"],
        functions=["diaphragm motor drive"],
        targets=["thoracic_inlet"],
    ),
}
