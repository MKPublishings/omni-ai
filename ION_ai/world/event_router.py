from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Mapping


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(slots=True)
class RoutedEvent:
    event_id: str
    event_type: str
    channel: str
    priority: str
    source: str
    tick: int
    payload: Dict[str, Any] = field(default_factory=dict)
    causality_chain: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=utc_now_iso)


EventHandler = Callable[[RoutedEvent], None]


class SovereignEventRouter:
    def __init__(self) -> None:
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._events: List[RoutedEvent] = []

    def register(self, event_type: str, handler: EventHandler) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    def route(self, event: RoutedEvent) -> RoutedEvent:
        self._events.append(event)
        for handler in self._handlers.get(event.event_type, []):
            handler(event)
        return event

    def emit(
        self,
        *,
        event_type: str,
        channel: str,
        priority: str,
        source: str,
        tick: int,
        payload: Mapping[str, Any] | None = None,
        causality_chain: List[str] | None = None,
    ) -> RoutedEvent:
        event = RoutedEvent(
            event_id=f"evt-{len(self._events) + 1}",
            event_type=event_type,
            channel=channel,
            priority=priority,
            source=source,
            tick=tick,
            payload=dict(payload or {}),
            causality_chain=list(causality_chain or []),
        )
        return self.route(event)

    def get_causality_chain(self, event_id: str) -> List[str]:
        for event in self._events:
            if event.event_id == event_id:
                return list(event.causality_chain)
        return []

    def get_events(self) -> List[RoutedEvent]:
        return list(self._events)