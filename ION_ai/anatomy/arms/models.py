from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping


@dataclass
class ArmJoints:
    shoulder_rotation_deg: float = 0.0
    shoulder_elevation_deg: float = 0.0
    shoulder_depression_deg: float = 0.0
    elbow_flexion_deg: float = 0.0
    elbow_extension_deg: float = 0.0
    forearm_pronation_deg: float = 0.0
    forearm_supination_deg: float = 0.0
    wrist_flexion_deg: float = 0.0
    wrist_extension_deg: float = 0.0
    wrist_radial_deviation_deg: float = 0.0
    wrist_ulnar_deviation_deg: float = 0.0


@dataclass
class ArmMuscles:
    upper_arm_force_newton: float = 0.0
    forearm_force_newton: float = 0.0
    intrinsic_hand_force_newton: float = 0.0
    activation_level: float = 0.0


@dataclass
class ArmNerves:
    signal_strength: float = 1.0
    conduction_latency_ms: float = 2.5


@dataclass
class ArmCirculation:
    perfusion_ml_min: float = 250.0
    oxygenation_ratio: float = 0.98


@dataclass
class ArmCommand:
    shoulder: Mapping[str, float] = field(default_factory=dict)
    elbow: Mapping[str, float] = field(default_factory=dict)
    forearm: Mapping[str, float] = field(default_factory=dict)
    wrist: Mapping[str, float] = field(default_factory=dict)
    fingers: Mapping[str, Mapping[str, float]] = field(default_factory=dict)
    contraction_intensity: float = 0.0
    signal_strength: float = 1.0
    perfusion_bias_ml_min: float = 0.0


@dataclass
class ArmSensoryData:
    proprioception_index: float
    tactile_map: Mapping[str, float]
    pain_signal: float


@dataclass
class ArmState:
    joints: ArmJoints
    muscles: ArmMuscles
    nerves: ArmNerves
    blood: ArmCirculation
    grip_strength: float
    force_output_newton: float
