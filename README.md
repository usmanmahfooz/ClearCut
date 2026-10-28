# ClearCut: AI Background Remover and Image Resizer

ClearCut is a self-hostable AI background remover and image resizer. It combines a FastAPI backend, ONNX Runtime CPU inference, and a responsive browser interface for transparent PNG export and custom image dimensions.

## Features

- Remove image backgrounds and export transparent PNG files.
- Preserve the source image dimensions during background removal.
- Resize images using custom width and height values with Pillow's Lanczos resampling.
- Switch between original and processed previews before downloading.
- Run locally or deploy with Docker Compose.
- Use CPU inference; no dedicated GPU is required.

## Technology

Python, FastAPI, ONNX Runtime, Pillow, NumPy, Uvicorn, HTML, CSS, and JavaScript.

## Quick start with Docker

Docker downloads the quantized RMBG-1.4 model during the image build. Review the model license before use.

```bash
git clone https://github.com/usmanmahfooz/ClearCut.git
cd ClearCut
docker compose up -d --build
```

Open http://localhost:8000.

Stop the application with:

```bash
docker compose down
```

## Run without Docker

Use Python 3.11 or newer and ensure you have permission to download and use the RMBG-1.4 model.

### Windows PowerShell

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
New-Item -ItemType Directory -Force models | Out-Null
python -c "import urllib.request; urllib.request.urlretrieve('https://huggingface.co/JCTN/RMBG-1.4/resolve/main/onnx/model_quantized.onnx?download=true', 'models/model_quantized.onnx')"
python run.py
```

### Linux or macOS

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
mkdir -p models
python -c "import urllib.request; urllib.request.urlretrieve('https://huggingface.co/JCTN/RMBG-1.4/resolve/main/onnx/model_quantized.onnx?download=true', 'models/model_quantized.onnx')"
python run.py
```

Open http://localhost:8000.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Open the studio |
| GET | `/health` | Check engine status |
| POST | `/remove-background` | Upload an image and return a transparent PNG |
| POST | `/resize-image` | Resize a processed image |

## Model licensing

ClearCut's original application code is MIT licensed. **The RMBG-1.4 model is not covered by the MIT license.** It is developed by BRIA AI and is distributed under the separate `bria-rmbg-1.4` terms, which restrict use to non-commercial purposes unless a separate commercial agreement applies. Read the current terms before downloading, building, or deploying the model:

- Model card: https://huggingface.co/briaai/RMBG-1.4
- Quantized ONNX mirror used by this project: https://huggingface.co/JCTN/RMBG-1.4/tree/main/onnx
- BRIA model license information: https://bria.ai/bria-huggingface-model-license-agreement/

The Dockerfile downloads the model at build time rather than committing the model binary to this repository. A Docker image that includes model weights remains subject to the model's separate license.

## Sample images

The original development archive's photographic demo samples are not included in this repository. The published interface focuses on the core upload, background-removal, preview, download, and resize workflow and does not depend on those optional sample assets.

## Deployment notes

- Configure HTTPS and request-size limits with a reverse proxy such as Nginx when hosting publicly.
- The app has no user authentication. Do not expose it to the public internet without evaluating abuse controls, upload limits, output retention, and rate limiting.
- Start with one Uvicorn worker on a low-memory VPS because each worker loads its own model copy.
- Processed images are written to `outputs/`; configure cleanup and persistent storage to suit your deployment.

## License

The ClearCut application code in this repository is licensed under the MIT License. Third-party model weights and any sample assets have separate licensing terms. See [LICENSE](LICENSE) and the model licensing notes above.
