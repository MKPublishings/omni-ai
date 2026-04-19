from __future__ import annotations

import unittest

from ION_ai.world import advance_world_bridge


class WorldBridgeTests(unittest.TestCase):
    def test_bridge_returns_python_authoritative_payload(self) -> None:
        response = advance_world_bridge(
            {
                "tick": 3,
                "snapshot": {
                    "worldId": "world-1",
                    "tick": 2,
                    "version": "world-1:tick:2",
                    "status": "idle",
                    "agents": {
                        "agent-1": {
                            "id": "agent-1",
                            "kind": "operator",
                            "status": "active",
                            "metrics": {"focus": 0.8},
                            "memory": [],
                            "tags": ["bridge"],
                            "updatedAt": "2026-04-18T00:00:00.000Z",
                        }
                    },
                    "environment": {
                        "mode": "sovereign",
                        "regions": {},
                        "signals": {},
                        "updatedAt": "2026-04-18T00:00:00.000Z",
                    },
                    "anomalies": [],
                    "lastEvents": [],
                    "frame": {
                        "frameId": "frame-2",
                        "tick": 2,
                        "stateVersion": "world-1:tick:2",
                        "createdAt": "2026-04-18T00:00:00.000Z",
                        "eventIds": [],
                        "anomalyIds": [],
                    },
                    "metadata": {},
                },
                "pendingEvents": [],
            }
        )

        self.assertEqual(response["metadata"]["authoritativeRuntime"], "python")
        self.assertEqual(response["lifecycle"], "idle")
        self.assertIn("environmentPatch", response)
        self.assertIn("events", response)
        self.assertEqual(response["events"][0]["type"], "world.tick.advanced")