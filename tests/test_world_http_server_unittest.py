from __future__ import annotations

import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from ION_ai.world.http_server import create_world_bridge_handler


class WorldHttpServerTests(unittest.TestCase):
    def setUp(self) -> None:
        handler = create_world_bridge_handler(token="secret-token")
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_address[1]}"

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def test_health_endpoint_reports_service(self) -> None:
        with urllib.request.urlopen(f"{self.base_url}/health") as response:
            payload = json.loads(response.read().decode("utf-8"))

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["service"], "python-world-bridge")
        self.assertTrue(payload["requiresAuth"])

    def test_advance_endpoint_requires_token(self) -> None:
        request = urllib.request.Request(
            f"{self.base_url}/advance",
            method="POST",
            headers={"Content-Type": "application/json"},
            data=json.dumps({"tick": 1, "snapshot": {}}).encode("utf-8"),
        )

        with self.assertRaises(urllib.error.HTTPError) as exc:
            urllib.request.urlopen(request)

        self.assertEqual(exc.exception.code, 401)
        exc.exception.read()
        exc.exception.close()

    def test_advance_endpoint_returns_bridge_payload(self) -> None:
        request = urllib.request.Request(
            f"{self.base_url}/advance",
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer secret-token",
            },
            data=json.dumps(
                {
                    "tick": 1,
                    "snapshot": {
                        "worldId": "world-1",
                        "tick": 0,
                        "status": "idle",
                        "agents": {},
                        "environment": {
                            "mode": "sovereign",
                            "regions": {},
                            "signals": {},
                            "updatedAt": "2026-04-18T00:00:00.000Z",
                        },
                        "anomalies": [],
                        "lastEvents": [],
                        "metadata": {},
                    },
                }
            ).encode("utf-8"),
        )

        with urllib.request.urlopen(request) as response:
            payload = json.loads(response.read().decode("utf-8"))

        self.assertEqual(payload["metadata"]["authoritativeRuntime"], "python")
        self.assertEqual(payload["lifecycle"], "idle")
        self.assertTrue(payload["events"])
        self.assertEqual(payload["events"][0]["type"], "world.tick.advanced")