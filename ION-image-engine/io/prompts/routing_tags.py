class RoutingTagger:
    def extract_tags(self, tokens):
        tags = []
        if "realistic" in tokens["style"]:
            tags.append("realistic")
        if "anime" in tokens["style"]:
            tags.append("anime")
        if "3d" in tokens["style"]:
            tags.append("3d")
        if "2.5d" in tokens["style"]:
            tags.append("2.5d")
        return tags
