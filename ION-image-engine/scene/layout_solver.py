class LayoutSolver:
    def arrange(self, elements):
        layout = []
        z_offset = 0
        for e in elements:
            layout.append({
                "type": e["type"],
                "mesh": e["asset"],
                "transform": {
                    "position": [0, 0, z_offset],
                    "rotation": [0, 0, 0],
                    "scale": [1, 1, 1]
                }
            })
            z_offset -= 2
        return layout
