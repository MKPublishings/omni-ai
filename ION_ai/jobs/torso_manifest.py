from __future__ import annotations

from .tasks import sow_envelope, sow_muscles, sow_organs, sow_structure, sow_systems

TORSO_SOWING_TASKS = {
    "structure": sow_structure,
    "organs": sow_organs,
    "systems": sow_systems,
    "muscles": sow_muscles,
    "envelope": sow_envelope,
}
