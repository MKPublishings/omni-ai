class HybridFusion:
    def __init__(self, depth_blender, style_transfer, consistency):
        self.depth_blender = depth_blender
        self.style_transfer = style_transfer
        self.consistency = consistency
    def generate(self, rtx_passes, diffusion_output, mode="refine"):
        base = rtx_passes["beauty"]
        depth = rtx_passes["depth"]
        if mode == "refine":
            fused = self.depth_blender.apply(base, diffusion_output, depth)
        elif mode == "stylize":
            fused = self.style_transfer.apply(base, diffusion_output, depth)
        elif mode == "override":
            fused = diffusion_output
        else:
            fused = diffusion_output
        return self.consistency.enforce(fused)
