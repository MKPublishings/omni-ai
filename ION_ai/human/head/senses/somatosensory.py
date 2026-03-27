from __future__ import annotations

from typing import Dict

from ION_ai.human.head.models import SenseOrgan

SOMATOSENSORY_ORGANS: Dict[str, SenseOrgan] = {
    "facial_mechanoreceptors": SenseOrgan(
        id="facial_mechanoreceptors",
        modality="somatosensory",
        name="Facial Mechanoreceptors",
        input_type="mechanical_thermal_nociceptive",
        output_path=["trigeminal_nerve", "thalamus", "somatosensory_cortex"],
    ),
}

SOMATOSENSORY_ORGAN = SOMATOSENSORY_ORGANS["facial_mechanoreceptors"]
