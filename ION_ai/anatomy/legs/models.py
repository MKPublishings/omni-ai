from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping


@dataclass
class LegJoints:
    hip_rotation_deg: float = 0.0
    hip_flexion_deg: float = 0.0
    hip_extension_deg: float = 0.0
    hip_abduction_deg: float = 0.0
    hip_adduction_deg: float = 0.0
    knee_flexion_deg: float = 0.0
    knee_extension_deg: float = 0.0
    knee_rotation_deg: float = 0.0
    ankle_dorsiflexion_deg: float = 0.0
    ankle_plantarflexion_deg: float = 0.0
    ankle_inversion_deg: float = 0.0
    ankle_eversion_deg: float = 0.0


@dataclass
class LegMuscles:
    thigh_force_newton: float = 0.0
    calf_force_newton: float = 0.0
    intrinsic_foot_force_newton: float = 0.0
    activation_level: float = 0.0


@dataclass
class LegNerves:
    signal_strength: float = 1.0
    conduction_latency_ms: float = 3.2


@dataclass
class LegCirculation:
    perfusion_ml_min: float = 400.0
    oxygenation_ratio: float = 0.97


@dataclass
class LegCommand:
    hip: Mapping[str, float] = field(default_factory=dict)
    knee: Mapping[str, float] = field(default_factory=dict)
    ankle: Mapping[str, float] = field(default_factory=dict)
    toes: Mapping[str, Mapping[str, float]] = field(default_factory=dict)
    load_newton: float = 0.0
    contraction_intensity: float = 0.0
    gait_phase: str = "stance"
    signal_strength: float = 1.0


@dataclass
class BalanceState:
    gait_phase: str
    center_of_mass_shift_mm: float
    tibial_load: float
    fibular_load: float
    pressure_distribution: Mapping[str, float]


@dataclass
class LegState:
    joints: LegJoints
    muscles: LegMuscles
    nerves: LegNerves
    blood: LegCirculation
    force_output_newton: float
    gait_phase: str
