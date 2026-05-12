class FastRTX:
    """
    Low-res, interactive RTX renderer.
    """
    def __init__(self, rtx_backend):
        self.rtx = rtx_backend
    def render(self, scene):
        # Override resolution + quality for preview
        if hasattr(self.rtx, 'set_preview_mode'):
            self.rtx.set_preview_mode(resolution=(256,256), samples=1)
        return self.rtx.render()
