class TextEncoder:
    def encode(self, prompt, negative_prompt=""):
        return {
            "prompt": prompt,
            "negative_prompt": negative_prompt
        }
