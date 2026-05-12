import torch
import torch.nn.functional as F
class DepthBlender:
    def __init__(self, device="cuda"):
        self.device = device
    def compute_depth_mask(self, depth, blur=7):
        d = depth.clone()
        d = (d - d.min()) / (d.max() - d.min() + 1e-6)
        d = 1.0 - d
        d = d.unsqueeze(0).unsqueeze(0)
        d = F.avg_pool2d(d, blur, stride=1, padding=blur//2)
        return d.squeeze()
    def apply(self, base, detail, depth):
        mask = self.compute_depth_mask(depth)
        mask = mask.unsqueeze(-1)
        return base * (1 - mask) + detail * mask
