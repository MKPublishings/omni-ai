def contour_strength(edge_threshold: float) -> float:
    return max(0.0, min(1.0, edge_threshold))


def test_edge_threshold_in_expected_operating_band() -> None:
    strength = contour_strength(0.42)
    assert 0.35 <= strength <= 0.5
