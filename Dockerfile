FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=8000
ENV RMBG_MODEL_URL=https://huggingface.co/JCTN/RMBG-1.4/resolve/main/onnx/model_quantized.onnx?download=true

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download third-party model weights during build; model license is separate.
RUN mkdir -p models && python -c "import os, urllib.request; urllib.request.urlretrieve(os.environ['RMBG_MODEL_URL'], 'models/model_quantized.onnx')"

COPY backend/ ./backend/
COPY frontend/ ./frontend/
RUN mkdir -p outputs

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
