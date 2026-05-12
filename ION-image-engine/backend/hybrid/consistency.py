import torch
import torch.nn.functional as F
class ConsistencyEnforcer:
    def __init__(self):
        pass
    def enforce(self, image):
        img = image.permute(2,0,1).unsqueeze(0)
        smoothed = F.avg_pool2d(img, 3, stride=1, padding=1)
        return smoothed.squeeze(0).permute(1,2,0)
