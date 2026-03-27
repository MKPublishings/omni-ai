from __future__ import annotations

from typing import Any, Optional


class IONError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, payload: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload


class IONAuthError(IONError):
    pass


class IONRateLimitError(IONError):
    pass


class IONServerError(IONError):
    pass


def map_http_error(status_code: int, message: str, payload: Any = None) -> IONError:
    if status_code in (401, 403):
        return IONAuthError(message, status_code=status_code, payload=payload)
    if status_code == 429:
        return IONRateLimitError(message, status_code=status_code, payload=payload)
    if status_code >= 500:
        return IONServerError(message, status_code=status_code, payload=payload)
    return IONError(message, status_code=status_code, payload=payload)