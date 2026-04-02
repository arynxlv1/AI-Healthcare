FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install Flower and PyTorch (CPU-only for the server — no training happens here)
RUN pip install --no-cache-dir flwr==1.5.0 torch==2.1.0 --index-url https://download.pytorch.org/whl/cpu numpy onnx

# Copy project root so fl_server and ml modules are importable
COPY . .

ENV PYTHONPATH=/app

CMD ["python", "-m", "fl_server.server"]
