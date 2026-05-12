from .object_library import ObjectLibrary
from .layout_solver import LayoutSolver
from .lighting_solver import LightingSolver
from .camera_solver import CameraSolver

class SceneGenerator:
    def __init__(self):
        self.objects = ObjectLibrary()
        self.layout = LayoutSolver()
        self.lighting = LightingSolver()
        self.camera = CameraSolver()

    def generate(self, prompt, tags):
        elements = self.objects.extract(prompt, tags)
        layout = self.layout.arrange(elements)
        lights = self.lighting.solve(prompt, tags)
        camera = self.camera.solve(prompt, tags, layout)
        scene = {
            "objects": layout,
            "lights": lights,
            "camera": camera
        }
        return scene
