from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "nodes"))

from atmospheric_fog import apply_fog


def test_haze_gradient_scales_with_density() -> None:
    fog = apply_fog([0.2, 0.5, 0.9], density=0.15)
    assert fog == [0.03, 0.075, 0.135]
