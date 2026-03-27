from __future__ import annotations

from dataclasses import dataclass, field

from .elbow import Elbow
from .forearm import Forearm
from .hand import Hand
from .models import ArmCirculation, ArmCommand, ArmJoints, ArmMuscles, ArmNerves, ArmSensoryData, ArmState
from .shoulder import Shoulder
from .upper_arm import UpperArm
from .wrist import Wrist


@dataclass
class Arm:
    name: str = "arm"
    shoulder: Shoulder = field(default_factory=Shoulder)
    upper_arm: UpperArm = field(default_factory=UpperArm)
    elbow: Elbow = field(default_factory=Elbow)
    forearm: Forearm = field(default_factory=Forearm)
    wrist: Wrist = field(default_factory=Wrist)
    hand: Hand = field(default_factory=Hand)
    joints: ArmJoints = field(default_factory=ArmJoints)
    muscles: ArmMuscles = field(default_factory=ArmMuscles)
    nerves: ArmNerves = field(default_factory=ArmNerves)
    blood: ArmCirculation = field(default_factory=ArmCirculation)

    def _sync_joint_state(self) -> None:
        self.joints.shoulder_rotation_deg = self.shoulder.joint.rotation
        self.joints.shoulder_elevation_deg = self.shoulder.joint.elevation
        self.joints.shoulder_depression_deg = self.shoulder.joint.depression
        self.joints.elbow_flexion_deg = self.elbow.joint.flexion
        self.joints.elbow_extension_deg = self.elbow.joint.extension
        self.joints.forearm_pronation_deg = self.forearm.pronation
        self.joints.forearm_supination_deg = self.forearm.supination
        self.joints.wrist_flexion_deg = self.wrist.flexion
        self.joints.wrist_extension_deg = self.wrist.extension
        self.joints.wrist_radial_deviation_deg = self.wrist.deviation_radial
        self.joints.wrist_ulnar_deviation_deg = self.wrist.deviation_ulnar

    def articulate(self, command: ArmCommand) -> ArmState:
        shoulder_values = command.shoulder
        elbow_values = command.elbow
        forearm_values = command.forearm
        wrist_values = command.wrist

        self.shoulder.articulate(
            rotation=float(shoulder_values.get("rotation", self.shoulder.joint.rotation)),
            elevation=float(shoulder_values.get("elevation", self.shoulder.joint.elevation)),
            depression=float(shoulder_values.get("depression", self.shoulder.joint.depression)),
        )
        self.elbow.articulate(
            flexion=float(elbow_values.get("flexion", self.elbow.joint.flexion)),
            extension=float(elbow_values.get("extension", self.elbow.joint.extension)),
        )
        self.forearm.rotate(
            pronation=float(forearm_values.get("pronation", self.forearm.pronation)),
            supination=float(forearm_values.get("supination", self.forearm.supination)),
        )
        self.wrist.articulate(
            flexion=float(wrist_values.get("flexion", self.wrist.flexion)),
            extension=float(wrist_values.get("extension", self.wrist.extension)),
            radial=float(wrist_values.get("radial", self.wrist.deviation_radial)),
            ulnar=float(wrist_values.get("ulnar", self.wrist.deviation_ulnar)),
        )
        self.hand.articulate_fingers(command.fingers)

        contraction = self.upper_arm.contract(command.contraction_intensity)
        grip_strength = self.hand.grip_strength()
        self.muscles.upper_arm_force_newton = contraction["force_output_newton"]
        self.muscles.forearm_force_newton = contraction["force_output_newton"] * 0.72
        self.muscles.intrinsic_hand_force_newton = grip_strength * 12.0
        self.muscles.activation_level = max(0.0, min(1.0, command.contraction_intensity))
        self.nerves.signal_strength = max(0.0, min(1.0, command.signal_strength))
        self.blood.perfusion_ml_min = max(0.0, 250.0 + command.perfusion_bias_ml_min + grip_strength * 10.0)

        self._sync_joint_state()
        return ArmState(
            joints=self.joints,
            muscles=self.muscles,
            nerves=self.nerves,
            blood=self.blood,
            grip_strength=grip_strength,
            force_output_newton=self.muscles.upper_arm_force_newton + self.muscles.forearm_force_newton,
        )

    def sense(self) -> ArmSensoryData:
        proprioception = (
            abs(self.joints.shoulder_rotation_deg)
            + abs(self.joints.elbow_flexion_deg)
            + abs(self.joints.wrist_flexion_deg)
        ) / 270.0
        tactile_map = {
            finger_name: max(0.0, min(1.0, finger.flexion / 90.0))
            for finger_name, finger in self.hand.fingers.items()
        }
        pain_signal = max(0.0, 1.0 - self.blood.oxygenation_ratio)
        return ArmSensoryData(
            proprioception_index=max(0.0, min(1.0, proprioception)),
            tactile_map=tactile_map,
            pain_signal=pain_signal,
        )
