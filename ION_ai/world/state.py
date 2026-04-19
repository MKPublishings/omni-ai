from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Mapping, MutableMapping


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_world_event(event: Mapping[str, Any]) -> Dict[str, Any]:
    payload = dict(event)
    if "event_id" in payload and "id" not in payload:
        payload["id"] = payload["event_id"]
    if "event_type" in payload and "type" not in payload:
        payload["type"] = payload["event_type"]
    if "created_at" in payload and "timestamp" not in payload:
        payload["timestamp"] = payload["created_at"]
    if "causality_chain" in payload and not isinstance(payload["causality_chain"], list):
        payload["causality_chain"] = list(payload["causality_chain"])
    return payload


@dataclass(slots=True)
class WorldAnomaly:
    anomaly_id: str
    anomaly_type: str
    severity: str
    summary: str
    tick: int
    causality_chain: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=utc_now_iso)


@dataclass(slots=True)
class WorldFrame:
    frame_id: str
    tick: int
    state_version: str
    created_at: str
    event_ids: List[str] = field(default_factory=list)
    anomaly_ids: List[str] = field(default_factory=list)


@dataclass(slots=True)
class WorldSnapshot:
    world_id: str
    tick: int
    version: str
    status: str
    agents: Dict[str, Dict[str, Any]]
    environment: Dict[str, Any]
    anomalies: List[WorldAnomaly]
    events: List[Dict[str, Any]]
    frame: WorldFrame
    metadata: Dict[str, Any]


class SovereignWorldState:
    def __init__(
        self,
        *,
        world_id: str = "ionirix-sovereign-world",
        environment: Mapping[str, Any] | None = None,
        metadata: Mapping[str, Any] | None = None,
    ) -> None:
        self.world_id = world_id
        self.tick = 0
        self.status = "idle"
        self.agents: Dict[str, Dict[str, Any]] = {}
        self.environment: Dict[str, Any] = {
            "mode": "sovereign",
            "regions": {},
            "signals": {},
            "updated_at": utc_now_iso(),
        }
        if environment:
            self.environment.update(dict(environment))
        self.metadata: Dict[str, Any] = dict(metadata or {})
        self._events: List[Dict[str, Any]] = []
        self._anomalies: List[WorldAnomaly] = []

    def set_status(self, status: str) -> None:
        self.status = status

    def advance_tick(self) -> int:
        self.tick += 1
        self.environment["updated_at"] = utc_now_iso()
        return self.tick

    def upsert_agent(self, agent_id: str, payload: Mapping[str, Any]) -> None:
        current = dict(self.agents.get(agent_id, {}))
        current.update(dict(payload))
        current["updated_at"] = utc_now_iso()
        self.agents[agent_id] = current

    def patch_environment(self, patch: Mapping[str, Any]) -> None:
        if "regions" in patch and isinstance(patch["regions"], Mapping):
            self.environment["regions"] = dict(patch["regions"])
        if "signals" in patch and isinstance(patch["signals"], Mapping):
            self.environment["signals"] = dict(patch["signals"])
        if "mode" in patch:
            self.environment["mode"] = patch["mode"]
        self.environment["updated_at"] = utc_now_iso()

    def append_event(self, event: Mapping[str, Any]) -> None:
        self._events.append(normalize_world_event(event))
        self._events = self._events[-64:]

    def replace_anomalies(self, anomalies: List[WorldAnomaly]) -> None:
        self._anomalies = list(anomalies)

    def snapshot(self) -> WorldSnapshot:
        version = f"{self.world_id}:tick:{self.tick}"
        frame = WorldFrame(
            frame_id=f"frame-{self.tick}",
            tick=self.tick,
            state_version=version,
            created_at=utc_now_iso(),
            event_ids=[str(event.get("id") or event.get("event_id") or "") for event in self._events[-24:]],
            anomaly_ids=[anomaly.anomaly_id for anomaly in self._anomalies],
        )
        return WorldSnapshot(
            world_id=self.world_id,
            tick=self.tick,
            version=version,
            status=self.status,
            agents={key: dict(value) for key, value in self.agents.items()},
            environment=_deep_copy_mapping(self.environment),
            anomalies=list(self._anomalies),
            events=[dict(event) for event in self._events[-24:]],
            frame=frame,
            metadata=dict(self.metadata),
        )


def _deep_copy_mapping(source: MutableMapping[str, Any] | Mapping[str, Any]) -> Dict[str, Any]:
    copied: Dict[str, Any] = {}
    for key, value in source.items():
        if isinstance(value, Mapping):
            copied[key] = _deep_copy_mapping(value)
        elif isinstance(value, list):
            copied[key] = [item for item in value]
        else:
            copied[key] = value
    return copied