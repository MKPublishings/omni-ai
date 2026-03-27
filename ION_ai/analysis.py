from .constants import Modes, Tasks
from .models import Input, Response


class AnalysisClient:
    def __init__(self, invoke):
        self._invoke = invoke

    def distill(self, text: str) -> Response:
        return self._invoke(task=Tasks.ANALYSIS_DISTILL, mode=Modes.ANALYSIS, input=Input(text=text))

    def extract(self, text: str) -> Response:
        return self._invoke(task=Tasks.ANALYSIS_EXTRACT, mode=Modes.ANALYSIS, input=Input(text=text))

    def classify(self, text: str) -> Response:
        return self._invoke(task=Tasks.ANALYSIS_CLASSIFY, mode=Modes.ANALYSIS, input=Input(text=text))

    def interpret(self, text: str) -> Response:
        return self._invoke(task=Tasks.ANALYSIS_INTERPRET, mode=Modes.ANALYSIS, input=Input(text=text))