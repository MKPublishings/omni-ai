from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Vertebrae:
    cervical_count: int
    thoracic_count: int
    lumbar_count: int
    curvature_profile: str
    load_capacity_newton: float
