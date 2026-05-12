class FastHybrid:
    """
    Lightweight hybrid fusion for preview mode.
    """
    def __init__(self, depth_blender):
        self.depth_blender = depth_blender
    def fuse(self, rtx_passes, diffusion):
        return self.depth_blender.apply(
            base=rtx_passes["beauty"],
            detail=diffusion,
            depth=rtx_passes["depth"]
        )
