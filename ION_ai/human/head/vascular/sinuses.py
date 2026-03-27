from __future__ import annotations

from typing import Dict

from ION_ai.human.head.models import Vessel

SINUSES: Dict[str, Vessel] = {
    "superior_sagittal": Vessel(
        id="superior_sagittal",
        name="Superior Sagittal Sinus",
        vessel_type="sinus",
        territory=["cerebral_veins"],
    ),
    "cavernous": Vessel(
        id="cavernous",
        name="Cavernous Sinus",
        vessel_type="sinus",
        territory=["ophthalmic_veins", "pituitary_region"],
    ),
}

# Backwards-compatible alias for older imports.
DURAL_SINUSES = SINUSES
