from __future__ import annotations

import os

from .http_server import serve_world_bridge


def main() -> None:
    host = os.getenv("ION_WORLD_BRIDGE_HOST", "127.0.0.1")
    port = int(os.getenv("ION_WORLD_BRIDGE_PORT", "8790"))
    token = os.getenv("ION_WORLD_BRIDGE_TOKEN") or None
    serve_world_bridge(host=host, port=port, token=token)


if __name__ == "__main__":
    main()