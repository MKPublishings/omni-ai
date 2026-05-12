class FastDiffusion:
    """
    Low-step diffusion for instant previews.
    """
    def __init__(self, diffusion_backend):
        self.diffusion = diffusion_backend
    def render(self, prompt):
        return self.diffusion.generate(
            prompt=prompt,
            profile={"width":256, "height":256, "steps":1, "cfg":0.5},
            seed=0
        )
