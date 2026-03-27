from __future__ import annotations

from typing import Dict

from ION_ai.human.head.models import Vessel

VEINS: Dict[str, Vessel] = {
    "internal_jugular": Vessel(
        id="internal_jugular",
        name="Internal Jugular Vein",
        vessel_type="vein",
        territory=["dural_sinuses", "deep_face", "brain_outflow"],
    ),
    "facial_vein": Vessel(
        id="facial_vein",
        name="Facial Vein",
        vessel_type="vein",
        territory=["superficial_face"],
    ),
    "retromandibular_vein": Vessel(
        id="retromandibular_vein",
        name="Retromandibular Vein",
        vessel_type="vein",
        territory=["parotid_region", "lateral_face"],
    ),
}
