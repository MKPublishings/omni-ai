class PromptTokenizer:
    def tokenize(self, text):
        text = text.lower()
        tokens = {
            "style": [],
            "subject": [],
            "modifiers": [],
            "camera": [],
            "lighting": [],
            "mood": [],
        }
        if "anime" in text:
            tokens["style"].append("anime")
        if "realistic" in text or "photoreal" in text:
            tokens["style"].append("realistic")
        if "3d" in text:
            tokens["style"].append("3d")
        if "2.5d" in text:
            tokens["style"].append("2.5d")
        return tokens
