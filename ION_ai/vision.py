from .constants import Modes, Tasks
from .models import Input, Response


class VisionClient:
    def __init__(self, invoke):
        self._invoke = invoke

    def behold(self, image: bytes) -> Response:
        return self._invoke(task=Tasks.VISION_BEHOLD, mode=Modes.VISION, input=Input(image=image))

    def discern(self, image: bytes) -> Response:
        return self._invoke(task=Tasks.VISION_DISCERN, mode=Modes.VISION, input=Input(image=image))

    def encode(self, image: bytes) -> Response:
        return self._invoke(task=Tasks.VISION_ENCODE, mode=Modes.VISION, input=Input(image=image))

    def interpret(self, image: bytes) -> Response:
        return self._invoke(task=Tasks.VISION_INTERPRET, mode=Modes.VISION, input=Input(image=image))