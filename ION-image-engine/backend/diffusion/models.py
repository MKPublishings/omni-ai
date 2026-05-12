import torch
from diffusers import AutoPipelineForText2Image

class DiffusionModelRegistry:
    def __init__(self, device="cuda"):
        self.device = device
        self.models = {}
    def load_sdxl_turbo(self):
        if "sdxl_turbo" in self.models:
            return self.models["sdxl_turbo"]
        pipe = AutoPipelineForText2Image.from_pretrained(
            "stabilityai/sdxl-turbo",
            torch_dtype=torch.float16,
            variant="fp16"
        ).to(self.device)
        self.models["sdxl_turbo"] = pipe
        return pipe
    def get(self, name):
        return self.models.get(name)
