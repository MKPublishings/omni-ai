from __future__ import annotations

import unittest

from omni_ai.human import head_api
from omni_ai.human.head.integration.graphs import supported_graphs
from omni_ai.human.head.integration.validate import validate_graph


class HeadSubsystemTests(unittest.TestCase):
    def test_explain_smile(self) -> None:
        response = head_api("integration", "explain_function", {"name": "smile"})
        self.assertEqual(response.status, "ok")
        self.assertIsNotNone(response.result)
        self.assertEqual(response.result["name"], "smile")
        self.assertTrue(response.result["graph"]["nodes"])

    def test_get_masseter(self) -> None:
        response = head_api("muscles", "get_muscle", {"id": "masseter"})
        self.assertEqual(response.status, "ok")
        self.assertIsNotNone(response.result)
        self.assertEqual(response.result["muscle"]["name"], "Masseter")

    def test_search_facial(self) -> None:
        response = head_api("integration", "search", {"query": "facial"})
        self.assertEqual(response.status, "ok")
        self.assertIsNotNone(response.result)
        self.assertTrue(any("Facial" in result["name"] for result in response.result["results"]))

    def test_registry_integrity_for_all_integration_graphs(self) -> None:
        graph_functions = supported_graphs()
        errors_by_graph = {}

        # Many aliases map to the same underlying function; validate each unique graph once.
        seen_function_names = set()
        for alias, graph_function in graph_functions.items():
            function_name = graph_function.__name__
            if function_name in seen_function_names:
                continue
            seen_function_names.add(function_name)

            graph = graph_function()
            errors = validate_graph(graph)
            if errors:
                errors_by_graph[alias] = errors

        self.assertFalse(errors_by_graph, f"Registry integrity errors found: {errors_by_graph}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
