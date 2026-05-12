from .router import BackendRouter
from .profile_manager import ProfileManager
from .gpu_scheduler import GPUScheduler

class IonEngine:
    def __init__(self, config):
        self.config = config
        self.profiles = ProfileManager(config["profile_dir"])
        self.router = BackendRouter(self.profiles)
        self.gpu = GPUScheduler(config["device"])
        self.rtx = None
        self.diffusion = None
        self.hybrid = None
        self.gateway = None
        self.scene_gen = None

    def attach_backends(self, rtx, diffusion, hybrid):
        self.rtx = rtx
        self.diffusion = diffusion
        self.hybrid = hybrid

    def attach_gateway(self, gateway):
        self.gateway = gateway

    def attach_scene_generator(self, scene_gen):
        self.scene_gen = scene_gen

    def generate(self, prompt, profile_name, seed=0):
        profile = self.profiles.load(profile_name)
        gateway_out = self.gateway.encode(prompt, profile)
        tags = gateway_out["tags"]
        scene = self.scene_gen.generate(prompt, tags)
        backend_name = self.router.select_backend(tags, profile)
        if backend_name == "rtx":
            self.rtx.load_scene(scene)
            self.rtx.set_camera(scene["camera"])
            rtx_passes = self.rtx.render()
            return rtx_passes["beauty"]
        if backend_name == "diffusion":
            return self.diffusion.generate(gateway_out["prompt"], profile, seed)
        if backend_name == "hybrid":
            self.rtx.load_scene(scene)
            self.rtx.set_camera(scene["camera"])
            rtx_passes = self.rtx.render()
            diffusion_img = self.diffusion.generate(gateway_out["prompt"], profile, seed)
            return self.hybrid.generate(rtx_passes, diffusion_img, mode="refine")
        raise ValueError("Unknown backend selected.")
