from .constants import Modes, Tasks
from .models import Input, Response


class CinematicClient:
    def __init__(self, invoke):
        self._invoke = invoke

    def envision(self, prompt: str) -> Response:
        return self._invoke(task=Tasks.CINEMATIC_ENVISION, mode=Modes.CINEMATIC, input=Input(text=prompt))

    def compose(self, prompt: str) -> Response:
        return self._invoke(task=Tasks.CINEMATIC_COMPOSE, mode=Modes.CINEMATIC, input=Input(text=prompt))

    def storyboard(self, prompt: str) -> Response:
        return self._invoke(task=Tasks.CINEMATIC_STORYBOARD, mode=Modes.CINEMATIC, input=Input(text=prompt))

    def evoke(self, prompt: str) -> Response:
        return self._invoke(task=Tasks.CINEMATIC_EVOKE, mode=Modes.CINEMATIC, input=Input(text=prompt))