"""
Training router — triggers ml/train_baseline.py as a subprocess and streams
stdout/stderr back to the client via Server-Sent Events.
Uses asyncio.to_thread to avoid blocking the event loop on Windows.
"""
import asyncio
import json
import pathlib
import subprocess
import sys
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter()

_ML_DIR = pathlib.Path(__file__).parent.parent.parent.parent / "ml"
_TRAIN_SCRIPT = _ML_DIR / "train_baseline.py"


@router.post("/start")
async def start_training(request: Request):
    if not _TRAIN_SCRIPT.exists():
        raise HTTPException(status_code=404, detail=f"Training script not found at {_TRAIN_SCRIPT}")

    async def stream_logs():
        yield f"data: {json.dumps({'log': 'Starting training...', 'done': False})}\n\n"

        # Run the blocking subprocess in a thread so we don't block the event loop
        def run() -> list[str]:
            proc = subprocess.Popen(
                [sys.executable, str(_TRAIN_SCRIPT)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                cwd=str(_ML_DIR),
                text=True,
                bufsize=1,
            )
            lines = []
            for line in proc.stdout:
                lines.append(line.rstrip())
            proc.wait()
            lines.append(f"__EXIT__{proc.returncode}")
            return lines

        lines = await asyncio.to_thread(run)

        for line in lines:
            if line.startswith("__EXIT__"):
                code = int(line.replace("__EXIT__", ""))
                if code == 0:
                    yield f"data: {json.dumps({'log': 'Training complete. Model exported to ml/model.onnx', 'done': True, 'success': True})}\n\n"
                else:
                    yield f"data: {json.dumps({'log': f'Training failed (exit code {code})', 'done': True, 'success': False})}\n\n"
            elif line:
                yield f"data: {json.dumps({'log': line, 'done': False})}\n\n"

    return StreamingResponse(stream_logs(), media_type="text/event-stream")


@router.get("/status")
async def training_status():
    model_path = _ML_DIR / "model.onnx"
    if model_path.exists():
        import datetime
        mtime = model_path.stat().st_mtime
        return {
            "model_exists": True,
            "last_trained": datetime.datetime.fromtimestamp(mtime).isoformat(),
            "size_kb": round(model_path.stat().st_size / 1024, 1),
        }
    return {"model_exists": False, "last_trained": None, "size_kb": 0}
