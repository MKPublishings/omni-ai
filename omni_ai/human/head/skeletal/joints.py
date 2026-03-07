from __future__ import annotations

from typing import Dict, List

JOINTS: Dict[str, List[str]] = {
    "temporomandibular_joint": ["temporal_left", "temporal_right", "mandible"],
    "coronal_suture": ["frontal", "parietal_left", "parietal_right"],
    "sagittal_suture": ["parietal_left", "parietal_right"],
    "lambdoid_suture": ["occipital", "parietal_left", "parietal_right"],
    "squamous_suture_left": ["temporal_left", "parietal_left"],
    "squamous_suture_right": ["temporal_right", "parietal_right"],
}
