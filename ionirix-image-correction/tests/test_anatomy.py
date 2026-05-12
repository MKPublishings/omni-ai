from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "nodes"))

from segmentation_masker import segment_body


def test_anatomy_regions_are_capped_and_present() -> None:
    result = segment_body({"face": 0.8, "neck": 1.2, "shoulders": -0.2})
    assert result["face"] == 0.8
    assert result["neck"] == 1.0
    assert result["shoulders"] == 0.0
