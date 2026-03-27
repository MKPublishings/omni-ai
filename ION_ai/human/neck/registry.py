from __future__ import annotations

from typing import Any, Dict

from ION_ai.human.neck.muscles import NECK_MUSCLES
from ION_ai.human.neck.nerves import NECK_NERVES
from ION_ai.human.neck.skeletal import CERVICAL_STRUCTURES
from ION_ai.human.neck.vascular import NECK_VESSELS

NECK_REGISTRY: Dict[str, Any] = {
    **CERVICAL_STRUCTURES,
    **NECK_MUSCLES,
    **NECK_NERVES,
    **NECK_VESSELS,
}
