from __future__ import annotations

from typing import Dict

from omni_ai.human.head.models import SenseOrgan

SMELL_ORGANS: Dict[str, SenseOrgan] = {
    "olfactory_epithelium": SenseOrgan(
        id="olfactory_epithelium",
        modality="smell",
        name="Olfactory Epithelium",
        input_type="odorant molecules",
        output_path=["olfactory_nerve", "olfactory_bulb", "olfactory_tract", "olfactory_cortex"],
    ),
}

SMELL_ORGAN = SMELL_ORGANS["olfactory_epithelium"]
