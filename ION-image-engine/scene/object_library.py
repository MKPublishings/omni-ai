class ObjectLibrary:
    def extract(self, prompt, tags):
        elements = []
        p = prompt.lower()
        if "warrior" in p:
            elements.append({"type": "mesh", "name": "warrior", "asset": "assets/warrior.usd"})
        if "cathedral" in p:
            elements.append({"type": "environment", "name": "cathedral", "asset": "assets/cathedral.usd"})
        if "forest" in p:
            elements.append({"type": "environment", "name": "forest", "asset": "assets/forest.usd"})
        return elements
