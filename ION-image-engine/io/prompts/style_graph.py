class StyleGraph:
    def apply_style(self, profile, tags):
        layers = []
        prefix = ""
        suffix = ""
        backend_hint = None
        if profile.get("style") == "cinematic":
            prefix += "cinematic lighting, volumetric fog, "
            layers.append("cinematic")
            backend_hint = "hybrid"
        if "anime" in tags["style"]:
            prefix += "anime style, clean lines, "
            layers.append("anime")
            backend_hint = "diffusion"
        if "realistic" in tags["style"]:
            prefix += "photorealistic, physically-based shading, "
            layers.append("realistic")
            backend_hint = "rtx"
        return {
            "prefix": prefix,
            "suffix": suffix,
            "layers": layers,
            "backend_hint": backend_hint
        }
