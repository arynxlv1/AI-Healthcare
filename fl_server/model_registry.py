"""
Model registry — persists the global model weights after each FL round
and exports to ONNX so the FastAPI backend can pick up the latest version.
"""
import os
import json
import numpy as np
from pathlib import Path
from datetime import datetime, timezone


REGISTRY_DIR = Path(__file__).resolve().parent.parent / "ml"
WEIGHTS_PATH = REGISTRY_DIR / "global_weights.npz"
METADATA_PATH = REGISTRY_DIR / "registry_metadata.json"


def save_global_weights(parameters: list[np.ndarray], round_num: int) -> None:
    """Persist aggregated numpy weight arrays to disk."""
    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    np.savez(WEIGHTS_PATH, *parameters)
    metadata = {
        "round": round_num,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "num_layers": len(parameters),
        "shapes": [list(p.shape) for p in parameters],
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[Registry] Saved global model — round {round_num}, {len(parameters)} layers.")


def load_global_weights() -> list[np.ndarray] | None:
    """Load the latest global weights from disk, or None if not found."""
    if not WEIGHTS_PATH.exists():
        return None
    data = np.load(WEIGHTS_PATH)
    return [data[k] for k in sorted(data.files)]


def export_to_onnx(round_num: int) -> bool:
    """
    Load the saved global weights into the DiseaseClassifier and export to ONNX.
    Called after each successful aggregation round.
    """
    weights = load_global_weights()
    if weights is None:
        print("[Registry] No weights to export.")
        return False

    try:
        import torch
        import sys
        sys.path.append(str(REGISTRY_DIR.parent))
        from ml.model import DiseaseClassifier, set_model_params

        model = DiseaseClassifier(input_dim=100, hidden_dim=64, num_classes=10)
        set_model_params(model, weights)
        model.eval()

        dummy_input = torch.randn(1, 100)
        onnx_path = REGISTRY_DIR / "model.onnx"
        torch.onnx.export(
            model,
            dummy_input,
            str(onnx_path),
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
            opset_version=11,
        )
        print(f"[Registry] Exported model.onnx after round {round_num}.")
        return True
    except Exception as e:
        print(f"[Registry] ONNX export failed: {e}")
        return False


def get_metadata() -> dict | None:
    if not METADATA_PATH.exists():
        return None
    with open(METADATA_PATH) as f:
        return json.load(f)
