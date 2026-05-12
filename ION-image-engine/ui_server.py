# ION Image Engine UI Backend (FastAPI)
# Serves the UI and handles image generation requests


import os
import sys
import uuid
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure local imports work
sys.path.insert(0, os.path.dirname(__file__))
from engine_bootstrap import build_engine, load_config

app = FastAPI()

# Serve static UI files
ui_dir = os.path.join(os.path.dirname(__file__), "ui")
app.mount("/ui", StaticFiles(directory=ui_dir), name="ui")

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model for generation request
class GenerateRequest(BaseModel):
    prompt: str
    profile: str = "photoreal"
    seed: int = 0

# Output directory for generated images
OUTPUT_DIR = os.path.join(ui_dir, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load engine once
config = load_config()
engine = build_engine(config)

@app.post("/ui/generate")
async def generate_image(req: GenerateRequest):
    # Generate image using pipeline
    image = engine.pipeline.generate(req.prompt, req.profile, req.seed)
    # Save image to file
    image_id = str(uuid.uuid4())
    image_path = os.path.join(OUTPUT_DIR, f"{image_id}.png")
    if hasattr(image, "save"):
        image.save(image_path)
    else:
        # If image is a numpy array or PIL Image, handle accordingly
        try:
            from PIL import Image as PILImage
            if isinstance(image, PILImage.Image):
                image.save(image_path)
            else:
                # Assume numpy array
                PILImage.fromarray(image).save(image_path)
        except Exception as e:
            return JSONResponse({"error": f"Failed to save image: {e}"}, status_code=500)
    # Return URL to image
    image_url = f"/ui/outputs/{image_id}.png"
    return {"image_url": image_url}

@app.get("/ui/outputs/{image_name}")
def get_image(image_name: str):
    image_path = os.path.join(OUTPUT_DIR, image_name)
    if os.path.exists(image_path):
        return FileResponse(image_path, media_type="image/png")
    return Response(status_code=404)

@app.get("/")
def root():
    # Redirect to UI
    return Response(status_code=307, headers={"Location": "/ui/index.html"})
