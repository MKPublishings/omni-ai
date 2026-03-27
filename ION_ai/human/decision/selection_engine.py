from __future__ import annotations

from typing import Dict, List


def select_option(scored_options: List[Dict[str, float | str]]) -> Dict[str, float | str]:
    return max(scored_options, key=lambda item: float(item.get("score", 0.0)))
