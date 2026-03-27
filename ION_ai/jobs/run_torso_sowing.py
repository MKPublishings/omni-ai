from __future__ import annotations

from .coordinator import TorsoSowingCoordinator


def run_torso_sowing() -> dict:
    return dict(TorsoSowingCoordinator().execute())
