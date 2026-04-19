from __future__ import annotations

import unittest

from ION_ai.world import SovereignWorldKernel


class StubSimulationEngine:
    def __init__(self, outputs: list[dict]) -> None:
        self.outputs = list(outputs)
        self.calls = 0

    def step(self) -> dict:
        index = min(self.calls, len(self.outputs) - 1)
        self.calls += 1
        return self.outputs[index]


class SovereignWorldKernelTests(unittest.TestCase):
    def test_lifecycle_transitions_are_recorded(self) -> None:
        kernel = SovereignWorldKernel(simulation_engine=StubSimulationEngine([_healthy_tick()]))

        kernel.initialize(reason="unit-test")
        paused = kernel.pause(reason="breakpoint")
        resumed = kernel.resume(reason="operator")
        persisted = kernel.persist_snapshot(reason="checkpoint")

        self.assertEqual(paused.status, "paused")
        self.assertEqual(resumed.status, "running")
        self.assertEqual(persisted.status, "running")

        lifecycle = persisted.metadata.get("lifecycle", [])
        self.assertGreaterEqual(len(lifecycle), 5)
        self.assertEqual(lifecycle[0]["to"], "initializing")
        self.assertEqual(lifecycle[1]["to"], "idle")
        self.assertEqual(lifecycle[-1]["to"], "running")
        self.assertEqual(persisted.metadata.get("last_persisted_version"), persisted.version)

    def test_spawned_agent_event_ids_are_preserved_in_snapshot(self) -> None:
        kernel = SovereignWorldKernel(simulation_engine=StubSimulationEngine([_healthy_tick()]))

        snapshot = kernel.spawn_agent("agent-1", {"role": "navigator", "status": "active"})
        agent_event = next(event for event in snapshot.events if event["type"] == "world.agent.spawned")

        self.assertTrue(snapshot.events)
        self.assertEqual(agent_event["type"], "world.agent.spawned")
        self.assertIn(agent_event["id"], snapshot.frame.event_ids)

    def test_advance_tick_emits_richer_anomalies(self) -> None:
        kernel = SovereignWorldKernel(
            simulation_engine=StubSimulationEngine(
                [
                    {
                        "pulse": {
                            "tension": 0.93,
                            "vitality": 0.14,
                            "cooperation": 0.08,
                            "strategy_score": 0.12,
                        },
                        "existential": {
                            "crises": [
                                {
                                    "civilization": "aurora",
                                    "risk_type": "cascade_failure",
                                    "severity": 0.91,
                                }
                            ]
                        },
                        "grand_strategy": {
                            "outcomes": {
                                "aurora": {"composite": 0.11},
                                "borealis": {"composite": 0.17},
                            }
                        },
                    }
                ]
            )
        )

        snapshot = kernel.advance_tick(reason="stress-test")
        anomaly_types = {anomaly.anomaly_type for anomaly in snapshot.anomalies}

        self.assertEqual(snapshot.status, "idle")
        self.assertIn("tension_spike", anomaly_types)
        self.assertIn("vitality_collapse", anomaly_types)
        self.assertIn("cooperation_breakdown", anomaly_types)
        self.assertIn("existential_cascade_failure", anomaly_types)
        self.assertIn("strategy_stall", anomaly_types)

    def test_paused_kernel_rejects_tick_advances(self) -> None:
        kernel = SovereignWorldKernel(simulation_engine=StubSimulationEngine([_healthy_tick()]))
        kernel.initialize()
        kernel.pause(reason="operator")

        with self.assertRaises(RuntimeError):
            kernel.advance_tick()


def _healthy_tick() -> dict:
    return {
        "pulse": {
            "tension": 0.31,
            "vitality": 0.71,
            "cooperation": 0.62,
            "strategy_score": 0.64,
        },
        "existential": {"crises": []},
        "grand_strategy": {"outcomes": {"aurora": {"composite": 0.64}}},
    }