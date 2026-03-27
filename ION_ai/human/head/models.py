from __future__ import annotations

from dataclasses import dataclass
from typing import List, Literal, Optional


@dataclass
class BrainRegion:
    id: str
    name: str
    lobe: Optional[str]
    hemisphere: Optional[Literal["left", "right", "bilateral"]]
    functions: List[str]
    connections: List[str]


@dataclass
class CranialNerve:
    number: int
    name: str
    nerve_type: Literal["sensory", "motor", "mixed"]
    functions: List[str]
    targets: List[str]


@dataclass
class SenseOrgan:
    id: str
    modality: Literal["vision", "hearing", "smell", "taste", "somatosensory"]
    name: str
    input_type: str
    output_path: List[str]


@dataclass
class Bone:
    id: str
    name: str
    region: Literal["cranium", "face"]
    articulations: List[str]


@dataclass
class Muscle:
    id: str
    name: str
    group: str
    actions: List[str]
    innervation: List[int]


@dataclass
class Vessel:
    id: str
    name: str
    vessel_type: Literal["artery", "vein", "sinus"]
    territory: List[str]


@dataclass
class Gland:
    id: str
    name: str
    gland_type: Literal["salivary", "lacrimal", "other"]
    secretion: List[str]
    innervation: List[int]
