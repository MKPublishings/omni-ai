from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "nodes"))

from shadow_softener import soften


def test_shadow_softness_reduces_local_peaks() -> None:
    shadow = [0.0, 1.0, 0.0]
    softened = soften(shadow, radius=0.6)
    assert len(softened) == len(shadow)
    assert softened[1] < 1.0
    assert softened[1] > softened[0]
