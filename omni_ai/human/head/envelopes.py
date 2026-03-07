from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional

HeadSubsystem = Literal[
    "brain",
    "senses",
    "nerves",
    "skeletal",
    "muscles",
    "vascular",
    "glands",
    "integration",
]


@dataclass
class HeadRequest:
    system: Literal["human_head"]
    subsystem: HeadSubsystem
    operation: str
    payload: Dict[str, Any]


@dataclass
class HeadResponse:
    system: Literal["human_head"]
    subsystem: HeadSubsystem
    operation: str
    status: Literal["ok", "error"]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
