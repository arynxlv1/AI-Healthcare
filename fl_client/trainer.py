"""
Local training loop for a hospital FL client.

Separated from client.py so it can be unit-tested independently.
"""
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.optim import Optimizer


def train_one_round(
    model: nn.Module,
    optimizer: Optimizer,
    train_loader: DataLoader,
    local_epochs: int = 3,
    device: str = "cpu",
) -> dict:
    """
    Run `local_epochs` of training and return a metrics dict.

    Returns:
        {"loss": float, "samples": int}
    """
    model.to(device)
    model.train()
    criterion = nn.CrossEntropyLoss()
    total_loss = 0.0
    total_samples = 0

    for epoch in range(local_epochs):
        epoch_loss = 0.0
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            optimizer.zero_grad()
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * len(X_batch)
            total_samples += len(X_batch)
        total_loss += epoch_loss
        print(f"[Trainer] Epoch {epoch + 1}/{local_epochs} — loss: {epoch_loss / max(total_samples, 1):.4f}")

    return {"loss": total_loss / max(total_samples, 1), "samples": total_samples}


def evaluate(
    model: nn.Module,
    test_loader: DataLoader,
    device: str = "cpu",
) -> dict:
    """
    Evaluate model on test_loader.

    Returns:
        {"loss": float, "accuracy": float, "samples": int}
    """
    model.to(device)
    model.eval()
    criterion = nn.CrossEntropyLoss()
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            total_loss += loss.item() * len(X_batch)
            _, predicted = torch.max(outputs, 1)
            correct += (predicted == y_batch).sum().item()
            total += len(X_batch)

    accuracy = correct / max(total, 1)
    avg_loss = total_loss / max(total, 1)
    print(f"[Trainer] Evaluation — accuracy: {accuracy:.4f}, loss: {avg_loss:.4f}")
    return {"loss": avg_loss, "accuracy": accuracy, "samples": total}
