import os
import sys
import uuid
import io

# Ensure backend directory is in sys.path regardless of execution context
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageOps

from remover import BackgroundRemover

OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI(
    title="ClearCut - AI Background Studio",
    version="3.1.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

remover = BackgroundRemover()


class ResizePayload(BaseModel):
    filename: str
    width: int
    height: int


@app.get("/")
def home():
    return FileResponse(
        os.path.join(FRONTEND_DIR, "index.html"),
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/style.css")
def get_style():
    return FileResponse(
        os.path.join(FRONTEND_DIR, "style.css"),
        media_type="text/css",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )


@app.get("/app.js")
def get_script():
    return FileResponse(
        os.path.join(FRONTEND_DIR, "app.js"),
        media_type="application/javascript",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )


@app.get("/health")
def health():
    return {
        "status": "online",
        "engine": "RMBG-1.4",
        "acceleration": "ONNX Runtime CPU",
        "resampling": "Lanczos-High-Precision"
    }


@app.post("/remove-background")
async def remove_background(file: UploadFile = File(...)):
    image_data = await file.read()

    try:
        input_image = Image.open(io.BytesIO(image_data))
        input_image.load()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a supported image.") from exc

    result = remover.remove(input_image)

    filename = f"{uuid.uuid4().hex}.png"
    output_path = os.path.join(OUTPUT_DIR, filename)

    # Save as lossless PNG; alpha stores the estimated foreground mask.
    result.save(output_path, "PNG", compress_level=3)

    return {
        "success": True,
        "filename": filename,
        "url": f"/outputs/{filename}",
        "width": result.width,
        "height": result.height
    }


@app.post("/resize-image")
async def resize_image(payload: ResizePayload):
    if payload.width <= 0 or payload.height <= 0:
        raise HTTPException(status_code=400, detail="Width and height must be positive integers.")
    if payload.width > 12000 or payload.height > 12000:
        raise HTTPException(status_code=400, detail="Dimensions exceed maximum supported resolution (12000px).")

    safe_filename = os.path.basename(payload.filename)
    source_path = os.path.join(OUTPUT_DIR, safe_filename)

    if not os.path.exists(source_path):
        raise HTTPException(status_code=404, detail="Requested image file was not found on server.")

    try:
        with Image.open(source_path) as image:
            image.load()
            resized = image.resize((payload.width, payload.height), Image.Resampling.LANCZOS)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unable to open the requested image.") from exc

    resized_filename = f"resized_{payload.width}x{payload.height}_{safe_filename}"
    resized_path = os.path.join(OUTPUT_DIR, resized_filename)
    resized.save(resized_path, "PNG", compress_level=3)

    return {
        "success": True,
        "filename": resized_filename,
        "url": f"/outputs/{resized_filename}",
        "width": payload.width,
        "height": payload.height
    }


app.mount(
    "/outputs",
    StaticFiles(directory=OUTPUT_DIR),
    name="outputs"
)

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)

SAMPLES_DIR = os.path.join(FRONTEND_DIR, "samples")
if os.path.exists(SAMPLES_DIR):
    app.mount(
        "/samples",
        StaticFiles(directory=SAMPLES_DIR),
        name="samples"
    )


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    print(f"Starting ClearCut Studio on http://{host}:{port} ...")
    uvicorn.run(app, host=host, port=port)
