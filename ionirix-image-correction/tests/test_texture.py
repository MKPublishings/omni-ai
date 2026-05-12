from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "nodes"))

from texture_randomizer import jitter_roughness


def test_texture_jitter_is_deterministic_with_seed() -> None:
    values = [0.5, 0.7, 0.9]
    a = jitter_roughness(values, jitter=0.2, seed=7)
    b = jitter_roughness(values, jitter=0.2, seed=7)
    assert a == b
    assert all(v >= 0.0 for v in a)
