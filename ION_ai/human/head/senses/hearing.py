from __future__ import annotations

from typing import Dict

from ION_ai.human.head.models import SenseOrgan

HEARING_ORGANS: Dict[str, SenseOrgan] = {
    "ear_left": SenseOrgan(
        id="ear_left",
        modality="hearing",
        name="Left Ear",
        input_type="sound",
        output_path=[
            "cochlea_left",
            "cochlear_nerve_left",
            "brainstem_nuclei",
            "inferior_colliculus",
            "medial_geniculate_nucleus",
            "auditory_cortex",
        ],
    ),
    "ear_right": SenseOrgan(
        id="ear_right",
        modality="hearing",
        name="Right Ear",
        input_type="sound",
        output_path=[
            "cochlea_right",
            "cochlear_nerve_right",
            "brainstem_nuclei",
            "inferior_colliculus",
            "medial_geniculate_nucleus",
            "auditory_cortex",
        ],
    ),
}

HEARING_ORGAN = HEARING_ORGANS["ear_left"]
