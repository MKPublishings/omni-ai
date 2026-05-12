import torch
class DiffusionSampler:
    def __init__(self, model_registry, text_encoder, device="cuda"):
        self.model_registry = model_registry
        self.text_encoder = text_encoder
        self.device = device
    def generate(self, prompt, profile, seed=0):
        torch.manual_seed(seed)
        pipe = self.model_registry.load_sdxl_turbo()
        enc = self.text_encoder.encode(prompt, profile.get("negative", ""))
        image = pipe(
            prompt=enc["prompt"],
            negative_prompt=enc["negative_prompt"],
            width=profile["width"],
            height=profile["height"],
            num_inference_steps=profile.get("steps", 4),
            guidance_scale=profile.get("cfg", 1.0)
        ).images[0]
        return image
