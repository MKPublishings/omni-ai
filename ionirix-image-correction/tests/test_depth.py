from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "nodes"))

from depth_estimator import estimate_depth


def test_foreground_midground_background_are_separated() -> None:
    depth = estimate_depth([0.1, 0.5, 0.9])
    assert len(depth) == 3
    assert depth[0] < depth[1] < depth[2]
