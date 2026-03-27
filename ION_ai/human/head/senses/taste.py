from __future__ import annotations

from typing import Dict

from omni_ai.human.head.models import SenseOrgan

TASTE_ORGANS: Dict[str, SenseOrgan] = {
    "tongue_anterior": SenseOrgan(
        id="tongue_anterior",
        modality="taste",
        name="Anterior Tongue",
        input_type="dissolved chemicals",
        output_path=["chorda_tympani_branch_facial_nerve", "nucleus_of_solitary_tract", "thalamus", "gustatory_cortex"],
    ),
    "tongue_posterior": SenseOrgan(
        id="tongue_posterior",
        modality="taste",
        name="Posterior Tongue",
        input_type="dissolved chemicals",
        output_path=["glossopharyngeal_nerve", "nucleus_of_solitary_tract", "thalamus", "gustatory_cortex"],
    ),
}

TASTE_ORGAN = TASTE_ORGANS["tongue_anterior"]
