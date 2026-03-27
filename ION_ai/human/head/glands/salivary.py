from __future__ import annotations

from typing import Dict

from ION_ai.human.head.models import Gland

SALIVARY_GLANDS: Dict[str, Gland] = {
    "parotid": Gland(
        id="parotid",
        name="Parotid Gland",
        gland_type="salivary",
        secretion=["serous"],
        innervation=[9],
    ),
    "submandibular": Gland(
        id="submandibular",
        name="Submandibular Gland",
        gland_type="salivary",
        secretion=["mixed"],
        innervation=[7],
    ),
    "sublingual": Gland(
        id="sublingual",
        name="Sublingual Gland",
        gland_type="salivary",
        secretion=["mucous", "mixed"],
        innervation=[7],
    ),
}
