class IonPipeline:
    """
    Full end-to-end pipeline:
      1. Ion Gateway (prompt → semantic bundle)
      2. Scene Generator (semantic → 3D scene graph)
      3. RTX Renderer (scene → render passes)
      4. Diffusion Backend (prompt → stylized image)
      5. Hybrid Fusion (RTX + diffusion → final image)
    """
    def __init__(self, gateway, scene_gen, rtx, diffusion, hybrid, orchestrator):
        self.gateway = gateway
        self.scene_gen = scene_gen
        self.rtx = rtx
        self.diffusion = diffusion
        self.hybrid = hybrid
        self.orchestrator = orchestrator

    def generate(self, prompt, profile_name, seed=0):
        # 1. Gateway: semantic prompt bundle
        profile = self.orchestrator.profiles.load(profile_name)
        bundle = self.gateway.encode(prompt, profile)
        # 2. Scene Generator: build 3D scene graph
        scene = self.scene_gen.generate(prompt, bundle["tags"])
        # 3. Attach scene + camera to RTX backend
        self.rtx.load_scene(scene)
        self.rtx.set_camera(scene["camera"])
        # 4. Orchestrator decides backend
        backend = self.orchestrator.router.select_backend(bundle["tags"], profile)
        if backend == "rtx":
            return self.rtx.generate(prompt, profile, seed)
        if backend == "diffusion":
            return self.diffusion.generate(prompt, profile, seed)
        if backend == "hybrid":
            rtx_passes = self.rtx.generate(prompt, profile, seed)
            diffusion_output = self.diffusion.generate(bundle["prompt"], profile, seed)
            return self.hybrid.generate(rtx_passes, diffusion_output, mode="refine")
        raise ValueError("Unknown backend selected.")
