from __future__ import annotations

from typing import Any, Dict, Mapping

from .kernel import SovereignWorldKernel
from .state import WorldAnomaly, normalize_world_event


def advance_world_bridge(request: Mapping[str, Any]) -> Dict[str, Any]:
    snapshot = _as_map(request.get("snapshot"))
    requested_tick = int(request.get("tick", snapshot.get("tick", 0) or 0))
    kernel = SovereignWorldKernel(
        world_id=str(snapshot.get("worldId", "ionirix-sovereign-world")),
        simulation_config=_extract_simulation_config(snapshot),
    )
    kernel.initialize(reason="bridge")
    _hydrate_kernel_from_snapshot(kernel, snapshot)

    current_tick = int(snapshot.get("tick", 0) or 0)
    steps = max(1, requested_tick - current_tick) if requested_tick > current_tick else 1
    bridge_snapshot = kernel.advance_tick(steps=steps, reason="bridge")

    bridge_events = [
        _to_bridge_event(event)
        for event in bridge_snapshot.events
        if int(event.get("tick", -1)) == bridge_snapshot.tick
    ]

    return {
        "agents": bridge_snapshot.agents,
        "environmentPatch": bridge_snapshot.environment,
        "anomalies": [_to_bridge_anomaly(anomaly) for anomaly in bridge_snapshot.anomalies],
        "events": bridge_events,
        "lifecycle": bridge_snapshot.status,
        "metadata": {
            "bridge": "python-world-bridge",
            "authoritativeRuntime": "python",
            "tick": bridge_snapshot.tick,
            "version": bridge_snapshot.version,
            "lifecycle": bridge_snapshot.metadata.get("lifecycle", []),
        },
    }


def _hydrate_kernel_from_snapshot(kernel: SovereignWorldKernel, snapshot: Mapping[str, Any]) -> None:
    if not snapshot:
        return

    kernel.state.world_id = str(snapshot.get("worldId", kernel.state.world_id))
    kernel.state.tick = int(snapshot.get("tick", kernel.state.tick) or 0)
    kernel.tick_manager._tick = kernel.state.tick
    kernel.state.status = str(snapshot.get("status", kernel.state.status))
    kernel.state.agents = {str(key): dict(value) for key, value in _as_map(snapshot.get("agents")).items()}
    kernel.state.environment = dict(snapshot.get("environment", kernel.state.environment))
    kernel.state.metadata.update(_as_map(snapshot.get("metadata")))
    kernel.state.replace_anomalies([_from_bridge_anomaly(anomaly) for anomaly in snapshot.get("anomalies", []) or []])
    kernel.state._events = [
        normalize_world_event(event)
        for event in snapshot.get("lastEvents", []) or []
        if isinstance(event, Mapping)
    ]


def _extract_simulation_config(snapshot: Mapping[str, Any]) -> Mapping[str, Any]:
    metadata = _as_map(snapshot.get("metadata"))
    config = metadata.get("simulation_config", {})
    return config if isinstance(config, Mapping) else {}


def _from_bridge_anomaly(value: Mapping[str, Any]) -> WorldAnomaly:
    return WorldAnomaly(
        anomaly_id=str(value.get("id", value.get("anomaly_id", "anomaly-unknown"))),
        anomaly_type=str(value.get("type", value.get("anomaly_type", "unknown"))),
        severity=str(value.get("severity", "low")),
        summary=str(value.get("summary", "")),
        tick=int(value.get("tick", 0) or 0),
        causality_chain=list(value.get("causalityChain", value.get("causality_chain", [])) or []),
        created_at=str(value.get("createdAt", value.get("created_at", "")) or ""),
    )


def _to_bridge_anomaly(anomaly: WorldAnomaly) -> Dict[str, Any]:
    return {
        "id": anomaly.anomaly_id,
        "type": anomaly.anomaly_type,
        "severity": anomaly.severity,
        "summary": anomaly.summary,
        "tick": anomaly.tick,
        "causalityChain": list(anomaly.causality_chain),
        "createdAt": anomaly.created_at,
    }


def _to_bridge_event(event: Mapping[str, Any]) -> Dict[str, Any]:
    normalized = normalize_world_event(event)
    return {
        "id": normalized.get("id"),
        "type": normalized.get("type"),
        "channel": normalized.get("channel"),
        "priority": normalized.get("priority"),
        "tick": normalized.get("tick"),
        "source": normalized.get("source"),
        "timestamp": normalized.get("timestamp"),
        "payload": dict(normalized.get("payload", {})),
        "causalityChain": list(normalized.get("causality_chain", normalized.get("causalityChain", [])) or []),
    }


def _as_map(value: Any) -> Dict[str, Any]:
    if isinstance(value, Mapping):
        return dict(value)
    return {}