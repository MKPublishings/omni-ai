from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx

from .__version__ import __version__
from .analysis import AnalysisClient
from .cinematic import CinematicClient
from .constants import Modes, Tasks
from .errors import OmniError, map_http_error
from .models import Input, Request, Response
from .reasoning import ReasoningClient
from .routing import RoutingClient
from .vision import VisionClient


class Client:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.mkomni.com/api/omni",
        timeout: float = 30.0,
        http_client: Optional[httpx.Client] = None,
    ):
        self.api_key = api_key
        self.base_url = os.getenv("OMNI_AI_BASE_URL", base_url)
        self.timeout = timeout
        self._owns_client = http_client is None
        self._http = http_client or httpx.Client(timeout=timeout)

        self.reasoning = ReasoningClient(self.invoke)
        self.vision = VisionClient(self.invoke)
        self.cinematic = CinematicClient(self.invoke)
        self.analysis = AnalysisClient(self.invoke)
        self.routing = RoutingClient(self.invoke)

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream, text/plain",
        }

    def _normalize_input(self, value: Optional[Input]) -> Input:
        return value if isinstance(value, Input) else Input()

    def invoke(
        self,
        request: Optional[Request] = None,
        *,
        task: Optional[str] = None,
        mode: str = Modes.ANALYSIS,
        input: Optional[Input] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> Response:
        if request is None:
            if not task:
                raise ValueError("task is required when request is not provided")
            request = Request(
                type="request",
                task=task,
                mode=mode,
                input=self._normalize_input(input),
                meta=meta
                or {
                    "client_version": __version__,
                    "stream": False,
                },
            )

        try:
            response = self._http.post(
                self.base_url,
                json=request.to_dict(),
                headers=self._headers(),
            )
        except httpx.HTTPError as exc:
            raise OmniError(f"Transport failure: {exc}") from exc

        if response.status_code >= 400:
            payload: Any
            try:
                payload = response.json()
                message = payload.get("error") or payload.get("message") or response.text
            except Exception:
                payload = response.text
                message = response.text
            raise map_http_error(response.status_code, str(message), payload=payload)

        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            payload = response.json()
            return Response.from_dict(payload)

        text = response.text
        fallback_payload = {
            "type": "response",
            "mode": request.mode,
            "output": {
                "text": text,
                "image": None,
                "video": None,
                "data": None,
            },
            "meta": {
                "model": None,
                "latency_ms": None,
                "tokens_in": None,
                "tokens_out": None,
                "version": __version__,
                "status_code": response.status_code,
                "content_type": content_type,
            },
        }
        return Response.from_dict(fallback_payload)

    def chat(self, text: str) -> Response:
        return self.reasoning.speak(text)

    def generate(self, prompt: str) -> Response:
        return self.cinematic.envision(prompt)

    def analyze(self, text: str) -> Response:
        return self.analysis.distill(text)

    def route(self, text: str) -> Response:
        return self.routing.chart(text)

    def vision_query(self, image: bytes) -> Response:
        return self.vision.behold(image)

    def close(self) -> None:
        if self._owns_client:
            self._http.close()

    def __enter__(self) -> "Client":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()