from __future__ import annotations

from typing import Any, Optional


class OmniError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, payload: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload


class OmniAuthError(OmniError):
    pass


class OmniRateLimitError(OmniError):
    pass


class OmniServerError(OmniError):
    pass


def map_http_error(status_code: int, message: str, payload: Any = None) -> OmniError:
    if status_code in (401, 403):
        return OmniAuthError(message, status_code=status_code, payload=payload)
    if status_code == 429:
        return OmniRateLimitError(message, status_code=status_code, payload=payload)
    if status_code >= 500:
        return OmniServerError(message, status_code=status_code, payload=payload)
    return OmniError(message, status_code=status_code, payload=payload)