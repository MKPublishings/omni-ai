class LightingSolver:
    def solve(self, prompt, tags):
        lights = []
        if "cinematic" in prompt.lower():
            lights.append({"type": "key", "intensity": 5000, "color": [1.0, 0.95, 0.9]})
            lights.append({"type": "rim", "intensity": 2000, "color": [0.8, 0.9, 1.0]})
        if "dark" in prompt.lower():
            lights.append({"type": "ambient", "intensity": 500})
        if not lights:
            lights.append({"type": "ambient", "intensity": 1500})
        return lights
