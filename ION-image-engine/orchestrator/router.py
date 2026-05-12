class BackendRouter:
    def __init__(self, profiles):
        self.profiles = profiles
    def analyze_prompt(self, prompt):
        tags = []
        p = prompt.lower()
        if "realistic" in p or "photogrammetry" in p:
            tags.append("realistic")
        if "anime" in p:
            tags.append("anime")
        if "3d" in p:
            tags.append("3d")
        if "2.5d" in p or "2.5 d" in p:
            tags.append("2.5d")
        if "illustration" in p or "graphic" in p:
            tags.append("illustration")
        return tags
    def select_backend(self, tags, profile):
        if profile.get("force_backend"):
            return profile["force_backend"]
        if "realistic" in tags:
            return "rtx"
        if "anime" in tags and "3d" in tags:
            return "hybrid"
        if "anime" in tags:
            return "diffusion"
        if "illustration" in tags:
            return "diffusion"
        return "hybrid"
