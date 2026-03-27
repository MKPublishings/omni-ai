from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Mapping

from omni_ai.envelope.arms import ArmsEnvelope
from omni_ai.envelope.legs import LegsEnvelope
from omni_ai.envelope.torso import TorsoEnvelope


@dataclass
class EnvelopeRegistry:
    head: Any
    torso: Any
    arms: Any | None = None
    legs: Any | None = None
    extra_envelopes: Mapping[str, Any] | None = None
    _envelopes: Dict[str, Any] = field(init=False, default_factory=dict)

    def __post_init__(self) -> None:
        self._envelopes = {
            "head": self.head,
            "torso": TorsoEnvelope(self.torso),
        }
        if self.arms is not None:
            self._envelopes["arms"] = ArmsEnvelope(self.arms)
        if self.legs is not None:
            self._envelopes["legs"] = LegsEnvelope(self.legs)
        if self.extra_envelopes:
            self._envelopes.update(self.extra_envelopes)

    def get(self, name: str) -> Any:
        envelope = self._envelopes.get(name)
        if envelope is None:
            raise KeyError(f"Envelope not found: {name}")
        return envelope
