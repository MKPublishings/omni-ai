from __future__ import annotations

from typing import Any, Dict

from ION_ai.human.head.envelopes import HeadRequest, HeadResponse, HeadSubsystem


def head(subsystem: HeadSubsystem, operation: str, payload: Dict[str, Any]) -> HeadResponse:
    from ION_ai.human.head import handle_head_request

    request = HeadRequest(
        system="human_head",
        subsystem=subsystem,
        operation=operation,
        payload=payload,
    )
    return handle_head_request(request)
