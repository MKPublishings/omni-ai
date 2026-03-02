from __future__ import annotations

import io
import importlib
from dataclasses import asdict
from typing import Any

from .contracts import ImageObject
from .model_registry import ModelProfile


class OmniUnavailableError(RuntimeError):
    pass


class OmniMediaEngine:
    def __init__(self) -> None:
        self._clients: dict[str, Any] = {}

    def _load_omni_client(self, profile: ModelProfile) -> Any:
        if profile.key in self._clients:
            return self._clients[profile.key]

        try:
            omni_module = importlib.import_module("vllm_omni.entrypoints.omni")
            Omni = getattr(omni_module, "Omni")
        except Exception as exc:
            raise OmniUnavailableError(
                "vllm_omni is not installed or unavailable in this runtime."
            ) from exc

        client = Omni(model=profile.omni_model_id)
        self._clients[profile.key] = client
        return client

    def probe_backend(self) -> dict[str, Any]:
        try:
            omni_module = importlib.import_module("vllm_omni.entrypoints.omni")
            omni_cls = getattr(omni_module, "Omni", None)
            has_class = callable(omni_cls)
            return {
                "image_backend_ready": bool(has_class),
                "backend": "vllm_omni",
                "import_ok": True,
                "omni_class_ok": bool(has_class),
                "cached_clients": len(self._clients),
            }
        except Exception as exc:
            return {
                "image_backend_ready": False,
                "backend": "vllm_omni",
                "import_ok": False,
                "omni_class_ok": False,
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
        client = self._load_omni_client(profile)
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
