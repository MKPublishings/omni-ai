from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Mapping

from .bridge import advance_world_bridge


def create_world_bridge_handler(*, token: str | None = None):
    class WorldBridgeHandler(BaseHTTPRequestHandler):
        server_version = "IONWorldBridge/1.0"

        def do_GET(self) -> None:  # noqa: N802
            if self.path == "/health":
                self._write_json(
                    200,
                    {
                        "ok": True,
                        "service": "python-world-bridge",
                        "requiresAuth": bool(token),
                    },
                )
                return

            self._write_json(404, {"error": "Not Found"})

        def do_POST(self) -> None:  # noqa: N802
            if self.path != "/advance":
                self._write_json(404, {"error": "Not Found"})
                return

            if token and self.headers.get("Authorization") != f"Bearer {token}":
                self._write_json(401, {"error": "Unauthorized"})
                return

            try:
                body = self._read_json_body()
            except ValueError as exc:
                self._write_json(400, {"error": str(exc)})
                return

            try:
                payload = advance_world_bridge(body)
            except Exception as exc:  # pragma: no cover - defensive runtime guard
                self._write_json(500, {"error": f"Bridge execution failed: {exc}"})
                return

            self._write_json(200, payload)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
            return

        def _read_json_body(self) -> Mapping[str, Any]:
            raw_length = self.headers.get("Content-Length", "0")
            try:
                length = int(raw_length)
            except ValueError as exc:
                raise ValueError("Invalid Content-Length header.") from exc

            raw = self.rfile.read(max(0, length))
            try:
                payload = json.loads(raw.decode("utf-8") or "{}")
            except json.JSONDecodeError as exc:
                raise ValueError("Request body must be valid JSON.") from exc

            if not isinstance(payload, Mapping):
                raise ValueError("Request body must be a JSON object.")
            return payload

        def _write_json(self, status: int, payload: Mapping[str, Any]) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    return WorldBridgeHandler


def serve_world_bridge(*, host: str = "127.0.0.1", port: int = 8790, token: str | None = None) -> None:
    handler = create_world_bridge_handler(token=token)
    server = ThreadingHTTPServer((host, port), handler)
    try:
        server.serve_forever()
    finally:
        server.server_close()