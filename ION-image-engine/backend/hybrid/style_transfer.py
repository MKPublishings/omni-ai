import torch
class StyleTransfer:
    def __init__(self, device="cuda"):
        self.device = device
    def apply(self, content, style, depth=None):
        alpha = 0.35 if depth is None else 0.5
        return content * (1 - alpha) + style * alpha
