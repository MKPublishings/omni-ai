from __future__ import annotations

from typing import Dict

from ION_ai.human.head.models import Bone

BONES: Dict[str, Bone] = {
    "frontal": Bone(id="frontal", name="Frontal Bone", region="cranium", articulations=["parietal_left", "parietal_right", "sphenoid", "ethmoid", "nasal_left", "nasal_right", "zygomatic_left", "zygomatic_right", "maxilla_left", "maxilla_right"]),
    "parietal_left": Bone(id="parietal_left", name="Left Parietal Bone", region="cranium", articulations=["frontal", "occipital", "temporal_left", "sphenoid", "parietal_right"]),
    "parietal_right": Bone(id="parietal_right", name="Right Parietal Bone", region="cranium", articulations=["frontal", "occipital", "temporal_right", "sphenoid", "parietal_left"]),
    "occipital": Bone(id="occipital", name="Occipital Bone", region="cranium", articulations=["parietal_left", "parietal_right", "temporal_left", "temporal_right", "sphenoid"]),
    "temporal_left": Bone(id="temporal_left", name="Left Temporal Bone", region="cranium", articulations=["parietal_left", "occipital", "sphenoid", "zygomatic_left", "mandible"]),
    "temporal_right": Bone(id="temporal_right", name="Right Temporal Bone", region="cranium", articulations=["parietal_right", "occipital", "sphenoid", "zygomatic_right", "mandible"]),
    "sphenoid": Bone(id="sphenoid", name="Sphenoid Bone", region="cranium", articulations=["frontal", "parietal_left", "parietal_right", "temporal_left", "temporal_right", "occipital", "ethmoid", "zygomatic_left", "zygomatic_right", "vomer"]),
    "ethmoid": Bone(id="ethmoid", name="Ethmoid Bone", region="cranium", articulations=["frontal", "sphenoid", "vomer", "nasal_left", "nasal_right", "maxilla_left", "maxilla_right", "lacrimal_left", "lacrimal_right", "palatine_left", "palatine_right", "inferior_nasal_concha_left", "inferior_nasal_concha_right"]),
    "mandible": Bone(id="mandible", name="Mandible", region="face", articulations=["temporal_left", "temporal_right"]),
    "maxilla_left": Bone(id="maxilla_left", name="Left Maxilla", region="face", articulations=["frontal", "ethmoid", "nasal_left", "lacrimal_left", "zygomatic_left", "palatine_left", "vomer", "maxilla_right"]),
    "maxilla_right": Bone(id="maxilla_right", name="Right Maxilla", region="face", articulations=["frontal", "ethmoid", "nasal_right", "lacrimal_right", "zygomatic_right", "palatine_right", "vomer", "maxilla_left"]),
    "zygomatic_left": Bone(id="zygomatic_left", name="Left Zygomatic Bone", region="face", articulations=["frontal", "temporal_left", "sphenoid", "maxilla_left"]),
    "zygomatic_right": Bone(id="zygomatic_right", name="Right Zygomatic Bone", region="face", articulations=["frontal", "temporal_right", "sphenoid", "maxilla_right"]),
}

SKULL_BONES = BONES
