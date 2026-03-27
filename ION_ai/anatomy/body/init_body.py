from __future__ import annotations

from omni_ai.anatomy.arms import Arm, BilateralArms
from omni_ai.anatomy.body.body import Body
from omni_ai.anatomy.legs import BilateralLegs, Leg
from omni_ai.jobs.coordinator import TorsoSowingCoordinator
from omni_ai.registry.anatomy_registry import AnatomyRegistry
from omni_ai.registry.envelope_registry import EnvelopeRegistry


def initialize_body(
    head: object,
    torso: object,
    spine: object,
    routing: object,
    envelopes: dict | None = None,
    arms: Arm | BilateralArms | None = None,
    legs: Leg | BilateralLegs | None = None,
) -> Body:
    sowing = TorsoSowingCoordinator().execute()
    if not sowing["completed"]:
        raise RuntimeError(f"Torso sowing failed: {sowing['errors']}")

    arm_model = arms or BilateralArms()
    leg_model = legs or BilateralLegs()

    anatomy_registry = AnatomyRegistry(head=head, torso=torso, spine=spine, arms=arm_model, legs=leg_model)
    envelope_registry = EnvelopeRegistry(
        head=head,
        torso=torso,
        arms=arm_model,
        legs=leg_model,
        extra_envelopes=envelopes,
    )
    _ = anatomy_registry
    return Body(envelope_registry=envelope_registry, routing=routing, spine=spine)
