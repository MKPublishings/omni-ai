from __future__ import annotations

from .job_state import JobState


def sow_structure() -> JobState:
    return JobState(name="structure", completed=True, artifacts=["structure:validated", "structure:registered"])


def sow_organs() -> JobState:
    return JobState(name="organs", completed=True, artifacts=["organs:validated", "organs:indexed"])


def sow_systems() -> JobState:
    return JobState(name="systems", completed=True, artifacts=["systems:validated", "systems:linked"])


def sow_muscles() -> JobState:
    return JobState(name="muscles", completed=True, artifacts=["muscles:validated", "muscles:registered"])


def sow_envelope() -> JobState:
    return JobState(name="envelope", completed=True, artifacts=["envelope:validated", "envelope:registered"])
