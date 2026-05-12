import yaml
import os
class ProfileManager:
    def __init__(self, profile_dir):
        self.profile_dir = profile_dir
        self.cache = {}
    def load(self, name):
        if name in self.cache:
            return self.cache[name]
        path = os.path.join(self.profile_dir, f"{name}.yaml")
        with open(path, "r") as f:
            profile = yaml.safe_load(f)
        self.cache[name] = profile
        return profile
