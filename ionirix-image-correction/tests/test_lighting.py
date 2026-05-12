def normalize_light_vector(azimuth: float, elevation: float) -> tuple[float, float]:
    az = max(-180.0, min(180.0, azimuth))
    el = max(-90.0, min(90.0, elevation))
    return az, el


def test_single_light_vector_is_stable() -> None:
    vector = normalize_light_vector(45, 30)
    assert vector == (45, 30)
