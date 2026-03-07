from __future__ import annotations

from omni_ai.human import head_api


def test_explain_smile() -> None:
    response = head_api("integration", "explain_function", {"name": "smile"})
    assert response.status == "ok"
    assert response.result is not None
    assert response.result["name"] == "smile"
    assert response.result["graph"]["nodes"]


def test_get_masseter() -> None:
    response = head_api("muscles", "get_muscle", {"id": "masseter"})
    assert response.status == "ok"
    assert response.result is not None
    assert response.result["muscle"]["name"] == "Masseter"


def test_search_facial() -> None:
    response = head_api("integration", "search", {"query": "facial"})
    assert response.status == "ok"
    assert response.result is not None
    assert any("Facial" in result["name"] for result in response.result["results"])
