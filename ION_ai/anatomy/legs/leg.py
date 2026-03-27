from __future__ import annotations

from dataclasses import dataclass, field

from .ankle import Ankle
from .foot import Foot
from .hip import Hip
from .knee import Knee
from .models import BalanceState, LegCirculation, LegCommand, LegJoints, LegMuscles, LegNerves, LegState
from .shin import Shin
from .thigh import Thigh


@dataclass
class Leg:
    name: str = "leg"
    hip: Hip = field(default_factory=Hip)
    thigh: Thigh = field(default_factory=Thigh)
    knee: Knee = field(default_factory=Knee)
    shin: Shin = field(default_factory=Shin)
    ankle: Ankle = field(default_factory=Ankle)
    foot: Foot = field(default_factory=Foot)
    joints: LegJoints = field(default_factory=LegJoints)
    muscles: LegMuscles = field(default_factory=LegMuscles)
    nerves: LegNerves = field(default_factory=LegNerves)
    blood: LegCirculation = field(default_factory=LegCirculation)

    def _sync_joint_state(self) -> None:
        self.joints.hip_rotation_deg = self.hip.joint.rotation
        self.joints.hip_flexion_deg = self.hip.joint.flexion
        self.joints.hip_extension_deg = self.hip.joint.extension
        self.joints.hip_abduction_deg = self.hip.joint.abduction
        self.joints.hip_adduction_deg = self.hip.joint.adduction
        self.joints.knee_flexion_deg = self.knee.joint.flexion
        self.joints.knee_extension_deg = self.knee.joint.extension
        self.joints.knee_rotation_deg = self.knee.joint.rotation
        self.joints.ankle_dorsiflexion_deg = self.ankle.dorsiflexion
        self.joints.ankle_plantarflexion_deg = self.ankle.plantarflexion
        self.joints.ankle_inversion_deg = self.ankle.inversion
        self.joints.ankle_eversion_deg = self.ankle.eversion

    def articulate(self, command: LegCommand) -> LegState:
        hip_values = command.hip
        knee_values = command.knee
        ankle_values = command.ankle

        self.hip.articulate(**hip_values)
        self.knee.articulate(
            flexion=float(knee_values.get("flexion", self.knee.joint.flexion)),
            extension=float(knee_values.get("extension", self.knee.joint.extension)),
            rotation=float(knee_values.get("rotation", self.knee.joint.rotation)),
        )
        self.ankle.articulate(**ankle_values)
        self.foot.articulate_toes(command.toes)

        contraction = self.thigh.contract(command.contraction_intensity)
        self.shin.distribute_load(command.load_newton)
        foot_pressure = self.foot.pressure_distribution(command.load_newton)

        self.muscles.thigh_force_newton = contraction["force_output_newton"]
        self.muscles.calf_force_newton = contraction["force_output_newton"] * 0.55
        self.muscles.intrinsic_foot_force_newton = foot_pressure["forefoot"] * 0.4
        self.muscles.activation_level = max(0.0, min(1.0, command.contraction_intensity))
        self.nerves.signal_strength = max(0.0, min(1.0, command.signal_strength))
        self.blood.perfusion_ml_min = max(0.0, 400.0 + command.load_newton * 0.25)

        self._sync_joint_state()
        return LegState(
            joints=self.joints,
            muscles=self.muscles,
            nerves=self.nerves,
            blood=self.blood,
            force_output_newton=self.muscles.thigh_force_newton + self.muscles.calf_force_newton,
            gait_phase=command.gait_phase,
        )

    def balance(self, load: float, gait_phase: str = "stance") -> BalanceState:
        shin_state = self.shin.distribute_load(load)
        pressure = self.foot.pressure_distribution(load)
        com_shift_mm = (pressure["forefoot"] - pressure["heel"]) * 0.08
        return BalanceState(
            gait_phase=gait_phase,
            center_of_mass_shift_mm=com_shift_mm,
            tibial_load=shin_state.tibial_load,
            fibular_load=shin_state.fibular_load,
            pressure_distribution=pressure,
        )
