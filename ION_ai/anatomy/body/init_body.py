from __future__ import annotations

from ION_ai.anatomy.arms import Arm, BilateralArms
from ION_ai.anatomy.body.body import Body
from ION_ai.anatomy.legs import BilateralLegs, Leg
from ION_ai.jobs.coordinator import TorsoSowingCoordinator
from ION_ai.registry.anatomy_registry import AnatomyRegistry
from ION_ai.registry.envelope_registry import EnvelopeRegistry


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
