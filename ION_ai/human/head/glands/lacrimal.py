from __future__ import annotations

from typing import Dict

from ION_ai.human.head.models import Gland

LACRIMAL_GLANDS: Dict[str, Gland] = {
    "lacrimal": Gland(
        id="lacrimal",
        name="Lacrimal Gland",
        gland_type="lacrimal",
        secretion=["tears"],
        innervation=[7],
    ),
}

LACRIMAL_GLAND = LACRIMAL_GLANDS["lacrimal"]
