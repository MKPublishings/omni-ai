from __future__ import annotations

from typing import Dict, List

# Region-level adjacency graph used for simple pathway explanations.
BRAIN_NETWORKS: Dict[str, List[str]] = {
    "language": ["wernicke_area", "broca_area", "motor_cortex"],
    "vision": ["thalamus", "visual_cortex", "parietal_cortex", "temporal_cortex"],
    "motor": ["prefrontal_cortex", "motor_cortex", "cerebellum", "brainstem"],
}
