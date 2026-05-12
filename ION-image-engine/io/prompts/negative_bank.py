class NegativeBank:
    def get(self, profile, tags):
        negatives = ["low quality", "blurry", "artifacts"]
        if "anime" in tags:
            negatives.append("overly realistic skin")
        if "realistic" in tags:
            negatives.append("cartoonish shading")
        return ", ".join(negatives)
