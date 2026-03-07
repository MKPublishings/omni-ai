from __future__ import annotations

import unittest

from omni_ai.human import head_api


class HeadNeckTraceBridgeTests(unittest.TestCase):
    def _trace(self, structure_id: str):
        response = head_api("integration", "trace", {"id": structure_id, "include_neck": True})
        self.assertEqual(response.status, "ok")
        self.assertIsNotNone(response.result)
        self.assertTrue(response.result.get("include_neck"))
        return response.result.get("connections", [])

    def test_occipital_has_neck_bridge_links(self) -> None:
        connections = self._trace("occipital")
        pairs = {(connection["from"], connection["to"]) for connection in connections}
        self.assertIn(("c1_atlas", "occipital"), pairs)
        self.assertIn(("sternocleidomastoid", "occipital"), pairs)

    def test_hyoid_has_head_and_neck_links(self) -> None:
        connections = self._trace("hyoid")
        sources = {connection["from"] for connection in connections}
        self.assertIn("suprahyoid_group", sources)
        self.assertIn("infrahyoid_group", sources)
        self.assertIn("ansa_cervicalis", sources)

    def test_mandible_links_include_neck_support(self) -> None:
        connections = self._trace("mandible")
        sources = {connection["from"] for connection in connections}
        self.assertIn("temporal_left", sources)
        self.assertIn("temporal_right", sources)
        self.assertIn("suprahyoid_group", sources)
        self.assertIn("hyoid", sources)

    def test_brainstem_links_include_neck_vascular_bridge(self) -> None:
        connections = self._trace("brainstem")
        pairs = {(connection["from"], connection["relation"]) for connection in connections}
        self.assertIn(("vertebral", "supplies"), pairs)
        self.assertIn(("vertebral_artery_neck", "supplies"), pairs)


if __name__ == "__main__":
    unittest.main(verbosity=2)
