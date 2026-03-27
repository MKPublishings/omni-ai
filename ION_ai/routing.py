from .constants import Modes, Tasks
from .models import Input, Response


class RoutingClient:
    def __init__(self, invoke):
        self._invoke = invoke

    def chart(self, text: str) -> Response:
        return self._invoke(task=Tasks.ROUTING_CHART, mode=Modes.ROUTING, input=Input(text=text))

    def evaluate(self, text: str) -> Response:
        return self._invoke(task=Tasks.ROUTING_EVALUATE, mode=Modes.ROUTING, input=Input(text=text))

    def orchestrate(self, text: str) -> Response:
        return self._invoke(task=Tasks.ROUTING_ORCHESTRATE, mode=Modes.ROUTING, input=Input(text=text))

    def map(self, text: str) -> Response:
        return self._invoke(task=Tasks.ROUTING_MAP, mode=Modes.ROUTING, input=Input(text=text))