from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class Input:
    text: Optional[str] = None
    image: Optional[Any] = None
    video: Optional[Any] = None
    data: Optional[Any] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "image": self.image,
            "video": self.video,
            "data": self.data,
        }


@dataclass
class Output:
    text: Optional[str] = None
    image: Optional[Any] = None
    video: Optional[Any] = None
    data: Optional[Any] = None

    @classmethod
    def from_dict(cls, value: Optional[Dict[str, Any]]) -> "Output":
        value = value or {}
        return cls(
            text=value.get("text"),
            image=value.get("image"),
            video=value.get("video"),
            data=value.get("data"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "image": self.image,
            "video": self.video,
            "data": self.data,
        }


@dataclass
class Meta:
    model: Optional[str] = None
    latency_ms: Optional[int] = None
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    version: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, value: Optional[Dict[str, Any]]) -> "Meta":
        value = value or {}
        known = {"model", "latency_ms", "tokens_in", "tokens_out", "version"}
        extra = {k: v for k, v in value.items() if k not in known}
        return cls(
            model=value.get("model"),
            latency_ms=value.get("latency_ms"),
            tokens_in=value.get("tokens_in"),
            tokens_out=value.get("tokens_out"),
            version=value.get("version"),
            extra=extra,
        )

    def to_dict(self) -> Dict[str, Any]:
        base: Dict[str, Any] = {
            "model": self.model,
            "latency_ms": self.latency_ms,
            "tokens_in": self.tokens_in,
            "tokens_out": self.tokens_out,
            "version": self.version,
        }
        base.update(self.extra)
        return base


@dataclass
class Request:
    type: str
    task: str
    mode: str
    input: Input
    meta: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "task": self.task,
            "mode": self.mode,
            "input": self.input.to_dict(),
            "meta": self.meta,
        }


@dataclass
class Response:
    type: str
    mode: str
    output: Output
    meta: Meta

    @classmethod
    def from_dict(cls, value: Dict[str, Any]) -> "Response":
        payload = value or {}
        response_type = payload.get("type") or "response"
        mode = payload.get("mode") or "analysis"
        output_payload = payload.get("output")
        if output_payload is None and "content" in payload:
            output_payload = {
                "text": payload.get("content"),
                "image": None,
                "video": None,
                "data": None,
            }
        output = Output.from_dict(output_payload)
        meta = Meta.from_dict(payload.get("meta"))
        return cls(type=response_type, mode=mode, output=output, meta=meta)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "mode": self.mode,
            "output": self.output.to_dict(),
            "meta": self.meta.to_dict(),
        }