from __future__ import annotations

from typing import Dict

from omni_ai.human.head.models import Vessel

ARTERIES: Dict[str, Vessel] = {
    "internal_carotid": Vessel(
        id="internal_carotid",
        name="Internal Carotid Artery",
        vessel_type="artery",
        territory=["anterior_cerebral", "middle_cerebral", "orbit", "deep_brain_structures"],
    ),
    "anterior_cerebral": Vessel(
        id="anterior_cerebral",
        name="Anterior Cerebral Artery",
        vessel_type="artery",
        territory=["medial_frontal_lobe", "medial_parietal_lobe"],
    ),
    "middle_cerebral": Vessel(
        id="middle_cerebral",
        name="Middle Cerebral Artery",
        vessel_type="artery",
        territory=["lateral_frontal_lobe", "lateral_parietal_lobe", "temporal_lobe"],
    ),
    "external_carotid": Vessel(
        id="external_carotid",
        name="External Carotid Artery",
        vessel_type="artery",
        territory=["face", "scalp", "superficial_head_structures"],
    ),
    "vertebral": Vessel(
        id="vertebral",
        name="Vertebral Artery",
        vessel_type="artery",
        territory=["brainstem", "cerebellum"],
    ),
    "basilar": Vessel(
        id="basilar",
        name="Basilar Artery",
        vessel_type="artery",
        territory=["brainstem", "cerebellum", "occipital_lobe"],
    ),
}
