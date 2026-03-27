from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SpinalCoupling:
    nerve_branch_points: int
    vascular_branch_points: int

    def distribute_neural(self, signal_strength: float) -> float:
        branch_count = max(self.nerve_branch_points, 1)
        return signal_strength / branch_count

    def distribute_flow(self, flow_l_min: float) -> float:
        branch_count = max(self.vascular_branch_points, 1)
        return flow_l_min / branch_count
