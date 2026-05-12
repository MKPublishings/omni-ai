import torch
class GPUScheduler:
    def __init__(self, device="cuda"):
        self.device = device
        self.loaded_models = {}
    def allocate(self, model_name, loader_fn):
        if model_name in self.loaded_models:
            return self.loaded_models[model_name]
        model = loader_fn().to(self.device)
        self.loaded_models[model_name] = model
        return model
    def clear_unused(self):
        pass
