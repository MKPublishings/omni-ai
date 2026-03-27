from __future__ import annotations

from typing import Dict

from omni_ai.human.head.models import SenseOrgan

VISION_ORGANS: Dict[str, SenseOrgan] = {
    "eye_left": SenseOrgan(
        id="eye_left",
        modality="vision",
        name="Left Eye",
        input_type="light",
        output_path=[
            "retina_left",
            "optic_nerve_left",
            "optic_chiasm",
            "optic_tract",
            "lateral_geniculate_nucleus",
            "visual_cortex",
        ],
    ),
    "eye_right": SenseOrgan(
        id="eye_right",
        modality="vision",
        name="Right Eye",
        input_type="light",
        output_path=[
            "retina_right",
            "optic_nerve_right",
            "optic_chiasm",
            "optic_tract",
            "lateral_geniculate_nucleus",
            "visual_cortex",
        ],
    ),
}

# Backwards-compatible alias kept for existing imports.
VISION_ORGAN = VISION_ORGANS["eye_left"]
