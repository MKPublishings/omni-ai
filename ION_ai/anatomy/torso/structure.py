from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SpineStructure:
    vertebrae_count: int
    curvature_profile: str


@dataclass
class Ribcage:
    rib_pairs: int
    protective_index: float


@dataclass
class Pelvis:
    load_capacity_newton: float


@dataclass
class ConnectiveTissue:
    elasticity_index: float
    stability_index: float
