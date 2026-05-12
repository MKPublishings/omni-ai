class Previewer:
    """
    Real-time preview pipeline:
      - Fast RTX
      - Fast Diffusion
      - Fast Hybrid Fusion
    """
    def __init__(self, fast_rtx, fast_diffusion, fast_hybrid):
        self.fast_rtx = fast_rtx
        self.fast_diffusion = fast_diffusion
        self.fast_hybrid = fast_hybrid

    def preview(self, scene, prompt, tags):
        """
        Returns a low-res preview image.
        """
        rtx_passes = self.fast_rtx.render(scene)
        diffusion = self.fast_diffusion.render(prompt)
        preview = self.fast_hybrid.fuse(rtx_passes, diffusion)
        return preview
