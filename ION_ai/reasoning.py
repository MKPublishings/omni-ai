from .constants import Modes, Tasks
from .models import Input, Response


class ReasoningClient:
    def __init__(self, invoke):
        self._invoke = invoke

    def speak(self, text: str) -> Response:
        return self._invoke(task=Tasks.REASONING_SPEAK, mode=Modes.ANALYSIS, input=Input(text=text))

    def unfold(self, text: str) -> Response:
        return self._invoke(task=Tasks.REASONING_UNFOLD, mode=Modes.ANALYSIS, input=Input(text=text))

    def resolve(self, text: str) -> Response:
        return self._invoke(task=Tasks.REASONING_RESOLVE, mode=Modes.ANALYSIS, input=Input(text=text))

    def contend(self, text: str) -> Response:
        return self._invoke(task=Tasks.REASONING_CONTEND, mode=Modes.ANALYSIS, input=Input(text=text))

    def illuminate(self, text: str) -> Response:
        return self._invoke(task=Tasks.REASONING_ILLUMINATE, mode=Modes.ANALYSIS, input=Input(text=text))