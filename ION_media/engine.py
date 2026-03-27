from __future__ import annotations

import io
import importlib
from dataclasses import asdict
from typing import Any

from .contracts import ImageObject
from .model_registry import ModelProfile


class IONUnavailableError(RuntimeError):
    pass


class IONMediaEngine:
    def __init__(self) -> None:
        self._clients: dict[str, Any] = {}

    def _load_ION_client(self, profile: ModelProfile) -> Any:
        if profile.key in self._clients:
            return self._clients[profile.key]

        try:
            ION_module = importlib.import_module("vllm_ION.entrypoints.ION")
            ION = getattr(ION_module, "ION")
        except Exception as exc:
            raise IONUnavailableError(
                "vllm_ION is not installed or unavailable in this runtime."
            ) from exc

        client = ION(model=profile.ION_model_id)
        self._clients[profile.key] = client
        return client

    def probe_backend(self) -> dict[str, Any]:
        try:
            ION_module = importlib.import_module("vllm_ION.entrypoints.ION")
            ION_cls = getattr(ION_module, "ION", None)
            has_class = callable(ION_cls)
            return {
                "image_backend_ready": bool(has_class),
                "backend": "vllm_ION",
                "import_ok": True,
                "ION_class_ok": bool(has_class),
                "cached_clients": len(self._clients),
            }
        except Exception as exc:
            return {
                "image_backend_ready": False,
                "backend": "vllm_ION",
                "import_ok": False,
                "ION_class_ok": False,
                "cached_clients": len(self._clients),
                "error": str(exc),
            }

    def generate_image(
        self,
        profile: ModelProfile,
        prompt: str,
        negative_prompt: str | None = None,
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        seed: int | None = None,
        guidance_scale: float = 7.5,
        num_inference_steps: int = 30,
        extra: dict[str, Any] | None = None,
    ) -> list[ImageObject]:
        client = self._load_ION_client(profile)
        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": min(width, profile.max_width),
            "height": min(height, profile.max_height),
            "num_images": max(1, num_images),
            "seed": seed,
            "guidance_scale": guidance_scale,
            "num_inference_steps": num_inference_steps,
            **(extra or {}),
        }

        result = client.generate(**payload)
        images: list[ImageObject] = []

        for output in result:
            for img in getattr(output, "images", []) or []:
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                images.append(
                    ImageObject(
                        bytes_data=buffer.getvalue(),
                        mime_type="image/png",
                        width=payload["width"],
                        height=payload["height"],
                    )
                )

        return images

    def debug_profile(self, profile: ModelProfile) -> dict[str, Any]:
        return asdict(profile)
