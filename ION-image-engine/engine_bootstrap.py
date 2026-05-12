import yaml
from orchestrator.engine import IonEngine
from io.prompts.gateway import IonGateway
from scene.generator import SceneGenerator
from backend.rtx.renderer import RTXRenderer
from backend.diffusion.models import DiffusionModelRegistry
from backend.diffusion.text_encoder import TextEncoder
from backend.diffusion.sampler import DiffusionSampler
from backend.hybrid.depth_blender import DepthBlender
from backend.hybrid.style_transfer import StyleTransfer
from backend.hybrid.consistency import ConsistencyEnforcer
from backend.hybrid.fusion import HybridFusion
from preview.previewer import Previewer
from preview.fast_rtx import FastRTX
from preview.fast_diffusion import FastDiffusion
from preview.fast_hybrid import FastHybrid

def load_config(path="config/engine.yaml"):
    with open(path, "r") as f:
        return yaml.safe_load(f)

def build_engine(config=None):
    if config is None:
        config = load_config()
    gateway = IonGateway()
    scene_gen = SceneGenerator()
    rtx = RTXRenderer(device=config["device"])
    model_registry = DiffusionModelRegistry(device=config["device"])
    text_encoder = TextEncoder()
    diffusion = DiffusionSampler(model_registry, text_encoder, device=config["device"])
    depth_blender = DepthBlender()
    style_transfer = StyleTransfer()
    consistency = ConsistencyEnforcer()
    hybrid = HybridFusion(depth_blender, style_transfer, consistency)
    engine = IonEngine(config)
    engine.attach_backends(rtx, diffusion, hybrid)
    engine.attach_gateway(gateway)
    engine.attach_scene_generator(scene_gen)
    # Attach previewer
    previewer = Previewer(
        fast_rtx=FastRTX(rtx),
        fast_diffusion=FastDiffusion(diffusion),
        fast_hybrid=FastHybrid(depth_blender)
    )
    engine.previewer = previewer

    # Attach IonPipeline
    from ion_image_engine.pipeline.pipeline import IonPipeline
    engine.pipeline = IonPipeline(
        gateway=gateway,
        scene_gen=scene_gen,
        rtx=rtx,
        diffusion=diffusion,
        hybrid=hybrid,
        orchestrator=engine
    )
    return engine
