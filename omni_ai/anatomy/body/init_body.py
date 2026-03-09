from __future__ import annotations

from omni_ai.anatomy.body.body import Body
from omni_ai.jobs.coordinator import TorsoSowingCoordinator
from omni_ai.registry.anatomy_registry import AnatomyRegistry
from omni_ai.registry.envelope_registry import EnvelopeRegistry


def initialize_body(head: object, torso: object, spine: object, routing: object, envelopes: dict | None = None) -> Body:
    sowing = TorsoSowingCoordinator().execute()
    if not sowing["completed"]:
        raise RuntimeError(f"Torso sowing failed: {sowing['errors']}")

    anatomy_registry = AnatomyRegistry(head=head, torso=torso, spine=spine)
    envelope_registry = EnvelopeRegistry(head=head, torso=torso, extra_envelopes=envelopes)
    _ = anatomy_registry
    return Body(envelope_registry=envelope_registry, routing=routing, spine=spine)
