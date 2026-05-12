from .tokenizer import PromptTokenizer
from .style_graph import StyleGraph
from .negative_bank import NegativeBank
from .routing_tags import RoutingTagger

class IonGateway:
    def __init__(self):
        self.tokenizer = PromptTokenizer()
        self.style_graph = StyleGraph()
        self.negatives = NegativeBank()
        self.tagger = RoutingTagger()

    def encode(self, prompt, profile):
        tokens = self.tokenizer.tokenize(prompt)
        tags = self.tagger.extract_tags(tokens)
        style = self.style_graph.apply_style(profile, tags)
        negative = self.negatives.get(profile, tags)
        return {
            "prompt": style["prefix"] + prompt + style["suffix"],
            "negative": negative,
            "tags": tags,
            "backend_hint": style["backend_hint"],
            "style_layers": style["layers"]
        }
