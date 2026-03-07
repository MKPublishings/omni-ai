from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal


@dataclass
class NeckStructure:
    id: str
    name: str
    category: Literal["bone", "joint", "support", "region"]
    connections: List[str] = field(default_factory=list)


@dataclass
class NeckMuscle:
    id: str
    name: str
    actions: List[str]
    innervation: List[str]
    connections: List[str] = field(default_factory=list)


@dataclass
class NeckNerve:
    id: str
    name: str
    roots: List[str]
    functions: List[str]
    targets: List[str]


@dataclass
class NeckVessel:
    id: str
    name: str
    vessel_type: Literal["artery", "vein"]
    territory: List[str]
    connections: List[str] = field(default_factory=list)
