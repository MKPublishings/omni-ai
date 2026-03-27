from __future__ import annotations

from typing import Dict

from ION_ai.human.neck.models import NeckVessel

NECK_VESSELS: Dict[str, NeckVessel] = {
    "common_carotid": NeckVessel(
        id="common_carotid",
        name="Common Carotid Artery",
        vessel_type="artery",
        territory=["face", "occipital", "brainstem", "cervical_plexus"],
        connections=["internal_carotid", "external_carotid"],
    ),
    "vertebral_artery_neck": NeckVessel(
        id="vertebral_artery_neck",
        name="Vertebral Artery (Cervical Segment)",
        vessel_type="artery",
        territory=["c1_atlas", "c2_axis", "brainstem", "cerebellum", "occipital"],
        connections=["vertebral", "basilar"],
    ),
    "internal_jugular_neck": NeckVessel(
        id="internal_jugular_neck",
        name="Internal Jugular Vein (Cervical Segment)",
        vessel_type="vein",
        territory=["dural_sinuses", "occipital", "neck"],
        connections=["internal_jugular"],
    ),
}
