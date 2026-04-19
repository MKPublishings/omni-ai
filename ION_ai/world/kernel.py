from __future__ import annotations

from dataclasses import asdict
from typing import Any, Dict, Iterable, Mapping

from ION_ai.simulation.engine import SimulationEngine

from .event_router import RoutedEvent, SovereignEventRouter
from .state import SovereignWorldState, WorldAnomaly, WorldSnapshot
from .tick_manager import TickManager

LIFECYCLE_INITIALIZING = "initializing"
LIFECYCLE_IDLE = "idle"
LIFECYCLE_RUNNING = "running"
LIFECYCLE_PAUSED = "paused"
LIFECYCLE_PERSISTING = "persisting"
LIFECYCLE_ERROR = "error"


class SovereignWorldKernel:
    def __init__(
        self,
        *,
        world_id: str = "ionirix-sovereign-world",
        simulation_engine: SimulationEngine | None = None,
        civilizations: Iterable[Any] | None = None,
        simulation_config: Mapping[str, Any] | None = None,
    ) -> None:
        self.tick_manager = TickManager()
        self.event_router = SovereignEventRouter()
        self.state = SovereignWorldState(world_id=world_id)
        self.simulation_engine = simulation_engine or SimulationEngine(
            civilizations=civilizations or [],
            config=simulation_config or {},
        )
        self.state.metadata.setdefault("lifecycle", [])
        self.state.metadata["kernel_contract"] = {
            "authoritative_runtime": "python",
            "event_router": "sovereign-event-router",
            "tick_manager": "authoritative",
        }

    def initialize(self, reason: str = "bootstrap") -> WorldSnapshot:
        self._transition_to(LIFECYCLE_INITIALIZING, reason=reason, emit_event=True)
        self.state.metadata["initialized_at"] = self.state.metadata.get("initialized_at") or self._utc_now_iso()
        self._transition_to(LIFECYCLE_IDLE, reason="kernel-ready", emit_event=True)
        return self.state.snapshot()

    def pause(self, reason: str = "manual") -> WorldSnapshot:
        self._transition_to(LIFECYCLE_PAUSED, reason=reason, emit_event=True)
        return self.state.snapshot()

    def resume(self, reason: str = "manual") -> WorldSnapshot:
        if self.state.status == LIFECYCLE_ERROR:
            raise RuntimeError("Cannot resume a kernel in error state.")
        self._transition_to(LIFECYCLE_RUNNING, reason=reason, emit_event=True)
        return self.state.snapshot()

    def fail(self, error_message: str) -> WorldSnapshot:
        self.state.metadata["last_error"] = error_message
        self._transition_to(LIFECYCLE_ERROR, reason=error_message, emit_event=True)
        return self.state.snapshot()

    def persist_snapshot(self, reason: str = "manual") -> WorldSnapshot:
        previous_status = self.state.status
        self._transition_to(LIFECYCLE_PERSISTING, reason=reason, emit_event=True)
        snapshot = self.state.snapshot()
        self.state.metadata["last_persisted_at"] = snapshot.frame.created_at
        self.state.metadata["last_persisted_version"] = snapshot.version
        restore_status = previous_status if previous_status != LIFECYCLE_PERSISTING else LIFECYCLE_IDLE
        self._transition_to(restore_status, reason="persist-complete", emit_event=True)
        return self.state.snapshot()

    def get_state_snapshot(self) -> WorldSnapshot:
        return self.state.snapshot()

    def spawn_agent(self, agent_id: str, payload: Mapping[str, Any]) -> WorldSnapshot:
        self._ensure_ready_for_mutation()
        self.state.upsert_agent(agent_id, payload)
        event = self.event_router.emit(
            event_type="world.agent.spawned",
            channel="agent",
            priority="normal",
            source="sovereign-world-kernel",
            tick=self.tick_manager.current_tick,
            payload={"agent_id": agent_id, **dict(payload)},
        )
        self._append_routed_event(event)
        return self.state.snapshot()

    def inject_event(self, payload: Mapping[str, Any]) -> RoutedEvent:
        self._ensure_ready_for_mutation()
        event = self.event_router.emit(
            event_type=str(payload.get("type", "world.external")),
            channel=str(payload.get("channel", "system")),
            priority=str(payload.get("priority", "normal")),
            source=str(payload.get("source", "external")),
            tick=self.tick_manager.current_tick,
            payload=dict(payload),
            causality_chain=list(payload.get("causality_chain", [])),
        )
        self._append_routed_event(event)
        return event

    def modify_environment(self, patch: Mapping[str, Any]) -> WorldSnapshot:
        self._ensure_ready_for_mutation()
        self.state.patch_environment(patch)
        event = self.event_router.emit(
            event_type="world.environment.modified",
            channel="environment",
            priority="high",
            source="sovereign-world-kernel",
            tick=self.tick_manager.current_tick,
            payload=dict(patch),
        )
        self._append_routed_event(event)
        return self.state.snapshot()

    def advance_tick(self, steps: int = 1, reason: str = "manual") -> WorldSnapshot:
        self._ensure_ready_for_tick()
        for _ in range(max(1, int(steps))):
            tick = self.tick_manager.advance(1, reason=reason)
            self.state.set_status(LIFECYCLE_RUNNING)
            self.state.advance_tick()
            simulation_output = self.simulation_engine.step()
            bridge_event = self.event_router.emit(
                event_type="world.tick.advanced",
                channel="kernel",
                priority="normal",
                source="sovereign-world-kernel",
                tick=tick,
                payload={
                    "reason": reason,
                    "pulse": simulation_output.get("pulse", {}),
                },
            )
            self._append_routed_event(bridge_event)
            anomalies = _extract_anomalies(simulation_output, tick=tick)
            self.state.replace_anomalies(anomalies)
            self.state.metadata["last_simulation_tick"] = simulation_output
            self.state.metadata["last_tick_reason"] = reason
        self.state.set_status(LIFECYCLE_IDLE)
        return self.state.snapshot()

    def run_scenario(self, scenario_id: str, directives: Iterable[str], target_ticks: int = 1) -> WorldSnapshot:
        self._ensure_ready_for_tick()
        scenario_event = self.event_router.emit(
            event_type="world.scenario.started",
            channel="system",
            priority="high",
            source="sovereign-world-kernel",
            tick=self.tick_manager.current_tick,
            payload={
                "scenario_id": scenario_id,
                "directives": list(directives),
                "target_ticks": target_ticks,
            },
        )
        self._append_routed_event(scenario_event)
        return self.advance_tick(steps=target_ticks, reason=f"scenario:{scenario_id}")

    def _ensure_ready_for_mutation(self) -> None:
        if self.state.status == LIFECYCLE_ERROR:
            raise RuntimeError("Kernel is in error state.")
        if self.state.status == LIFECYCLE_INITIALIZING:
            raise RuntimeError("Kernel is initializing.")
        if self.state.status == LIFECYCLE_PERSISTING:
            raise RuntimeError("Kernel is persisting state.")
        if self.state.metadata.get("initialized_at") is None:
            self.initialize()

    def _ensure_ready_for_tick(self) -> None:
        self._ensure_ready_for_mutation()
        if self.state.status == LIFECYCLE_PAUSED:
            raise RuntimeError("Kernel is paused.")

    def _append_routed_event(self, event: RoutedEvent) -> None:
        self.state.append_event(asdict(event))

    def _transition_to(self, status: str, *, reason: str, emit_event: bool) -> None:
        previous_status = self.state.status
        self.state.set_status(status)
        transition = {
            "from": previous_status,
            "to": status,
            "reason": reason,
            "tick": self.tick_manager.current_tick,
            "timestamp": self._utc_now_iso(),
        }
        self.state.metadata.setdefault("lifecycle", []).append(transition)
        self.state.metadata["last_status_change"] = transition

        if emit_event and previous_status != status:
            lifecycle_event = self.event_router.emit(
                event_type="world.lifecycle.changed",
                channel="system",
                priority="high" if status in {LIFECYCLE_ERROR, LIFECYCLE_PERSISTING} else "normal",
                source="sovereign-world-kernel",
                tick=self.tick_manager.current_tick,
                payload=transition,
                causality_chain=[f"lifecycle.{previous_status}", f"lifecycle.{status}"],
            )
            self._append_routed_event(lifecycle_event)

    def _utc_now_iso(self) -> str:
        return self.state.environment.get("updated_at", "") or self.state.snapshot().frame.created_at


def _extract_anomalies(simulation_output: Mapping[str, Any], *, tick: int) -> list[WorldAnomaly]:
    anomalies: list[WorldAnomaly] = []
    pulse = simulation_output.get("pulse", {})
    if isinstance(pulse, Mapping):
        tension = float(pulse.get("tension", 0.0))
        vitality = float(pulse.get("vitality", 1.0))
        if tension >= 0.85:
            anomalies.append(
                WorldAnomaly(
                    anomaly_id=f"anomaly-tension-{tick}",
                    anomaly_type="tension_spike",
                    severity="high",
                    summary="Global tension exceeded sovereign threshold.",
                    tick=tick,
                    causality_chain=["pulse.tension"],
                )
            )
        if vitality <= 0.2:
            anomalies.append(
                WorldAnomaly(
                    anomaly_id=f"anomaly-vitality-{tick}",
                    anomaly_type="vitality_collapse",
                    severity="critical",
                    summary="World vitality collapsed below resilience floor.",
                    tick=tick,
                    causality_chain=["pulse.vitality"],
                )
            )
        cooperation = float(pulse.get("cooperation", 1.0))
        if cooperation <= 0.15:
            anomalies.append(
                WorldAnomaly(
                    anomaly_id=f"anomaly-cooperation-{tick}",
                    anomaly_type="cooperation_breakdown",
                    severity="high",
                    summary="Cooperation collapsed below sovereign continuity threshold.",
                    tick=tick,
                    causality_chain=["pulse.cooperation"],
                )
            )

    existential = simulation_output.get("existential", {})
    crises = existential.get("crises", []) if isinstance(existential, Mapping) else []
    for index, crisis in enumerate(crises):
        if not isinstance(crisis, Mapping):
            continue
        severity = float(crisis.get("severity", 0.0))
        if severity < 0.75:
            continue
        crisis_type = str(crisis.get("risk_type", "systemic"))
        civilization = str(crisis.get("civilization", "unknown"))
        anomalies.append(
            WorldAnomaly(
                anomaly_id=f"anomaly-crisis-{tick}-{index}",
                anomaly_type=f"existential_{crisis_type}",
                severity="critical" if severity >= 0.9 else "high",
                summary=f"Existential crisis pressure exceeded threshold for {civilization}.",
                tick=tick,
                causality_chain=[f"existential.crises[{index}]", f"civilization.{civilization}"],
            )
        )

    strategy = simulation_output.get("grand_strategy", {})
    strategy_outcomes = strategy.get("outcomes", {}) if isinstance(strategy, Mapping) else {}
    if isinstance(strategy_outcomes, Mapping) and strategy_outcomes:
        composites = []
        for metrics in strategy_outcomes.values():
            if isinstance(metrics, Mapping):
                composites.append(float(metrics.get("composite", 0.0)))
        if composites and sum(composites) / len(composites) <= 0.2:
            anomalies.append(
                WorldAnomaly(
                    anomaly_id=f"anomaly-strategy-{tick}",
                    anomaly_type="strategy_stall",
                    severity="medium",
                    summary="Strategic posture degraded below coherent planning threshold.",
                    tick=tick,
                    causality_chain=["grand_strategy.outcomes"],
                )
            )
    return anomalies