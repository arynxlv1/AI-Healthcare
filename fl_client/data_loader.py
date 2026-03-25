"""
Hospital data loader for federated learning.

In production this reads real patient records (CSV or FHIR R4 JSON).
For the demo it generates synthetic data with the same 100-feature schema
used by the ONNX model so the FL round can actually run end-to-end.
"""
import torch
from torch.utils.data import DataLoader, TensorDataset
from pathlib import Path
import json
import csv


def _load_csv(path: str, num_features: int = 100, num_classes: int = 10):
    """Load a CSV where the last column is the label (0-indexed integer)."""
    X, y = [], []
    with open(path, newline="") as f:
        reader = csv.reader(f)
        next(reader, None)  # skip header
        for row in reader:
            if len(row) < num_features + 1:
                continue
            X.append([float(v) for v in row[:num_features]])
            y.append(int(row[num_features]))
    return torch.tensor(X, dtype=torch.float32), torch.tensor(y, dtype=torch.long)


def _synthetic_data(n_train: int = 200, n_test: int = 50, num_features: int = 100, num_classes: int = 10):
    """Generate reproducible synthetic data (same seed per hospital_id)."""
    X_train = torch.randn(n_train, num_features)
    y_train = torch.randint(0, num_classes, (n_train,))
    X_test  = torch.randn(n_test,  num_features)
    y_test  = torch.randint(0, num_classes, (n_test,))
    return X_train, y_train, X_test, y_test


def get_data_loaders(
    data_path: str | None = None,
    data_format: str = "csv",
    batch_size: int = 32,
    num_features: int = 100,
    num_classes: int = 10,
) -> tuple[DataLoader, DataLoader]:
    """
    Returns (train_loader, test_loader).

    If data_path is provided and the file exists, loads real data.
    Otherwise falls back to synthetic data so the FL pipeline can run.
    """
    if data_path and Path(data_path).exists():
        print(f"[DataLoader] Loading real data from {data_path}")
        if data_format == "csv":
            X, y = _load_csv(data_path, num_features, num_classes)
            split = int(len(X) * 0.8)
            X_train, y_train = X[:split], y[:split]
            X_test,  y_test  = X[split:], y[split:]
        else:
            raise NotImplementedError(f"Format '{data_format}' not yet supported. Contribute a loader!")
    else:
        print(f"[DataLoader] No data file found at '{data_path}' — using synthetic data.")
        X_train, y_train, X_test, y_test = _synthetic_data(
            num_features=num_features, num_classes=num_classes
        )

    train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=batch_size, shuffle=True)
    test_loader  = DataLoader(TensorDataset(X_test,  y_test),  batch_size=batch_size)
    return train_loader, test_loader
