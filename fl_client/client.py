"""
Flower FL client for a hospital node.

Run with:
    python -m fl_client.client

Requires the Flower server to be running (fl_server/server.py).
"""
import os
import sys
import yaml
import torch
import torch.optim as optim

import flwr as fl

# Allow importing from project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.model import DiseaseClassifier, get_model_params, set_model_params
from fl_client.data_loader import get_data_loaders
from fl_client.dp_wrapper import DPWrapper, DPConfig
from fl_client.trainer import train_one_round, evaluate


def load_config(path: str = "fl_client/config.yaml") -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


class HospitalClient(fl.client.NumPyClient):
    def __init__(self, model, train_loader, test_loader, dp_wrapper, optimizer, config):
        self.model = model
        self.train_loader = train_loader
        self.test_loader = test_loader
        self.dp_wrapper = dp_wrapper
        self.optimizer = optimizer
        self.config = config

    def get_parameters(self, config):
        return get_model_params(self.model)

    def fit(self, parameters, config):
        set_model_params(self.model, parameters)
        metrics = train_one_round(
            model=self.model,
            optimizer=self.optimizer,
            train_loader=self.train_loader,
            local_epochs=self.config.get("local_epochs", 3),
            device=self.config.get("device", "cpu"),
        )
        epsilon = self.dp_wrapper.get_epsilon()
        print(f"[Client] Local training done. ε={epsilon:.4f}")
        return (
            get_model_params(self.model),
            metrics["samples"],
            {"epsilon": epsilon, "loss": metrics["loss"]},
        )

    def evaluate(self, parameters, config):
        set_model_params(self.model, parameters)
        result = evaluate(
            model=self.model,
            test_loader=self.test_loader,
            device=self.config.get("device", "cpu"),
        )
        return result["loss"], result["samples"], {"accuracy": result["accuracy"]}


def setup_client(config_path: str = "fl_client/config.yaml") -> HospitalClient:
    config = load_config(config_path)

    model = DiseaseClassifier(input_dim=100, hidden_dim=64, num_classes=10)
    optimizer = optim.Adam(model.parameters(), lr=config.get("learning_rate", 0.001))

    train_loader, test_loader = get_data_loaders(
        data_path=config.get("data_path"),
        data_format=config.get("data_format", "csv"),
        batch_size=config.get("batch_size", 32),
    )

    dp_config = DPConfig(
        max_grad_norm=config.get("max_grad_norm", 1.0),
        delta=config.get("delta", 1e-5),
    )
    dp_wrapper = DPWrapper(dp_config)

    if config.get("dp_enabled", True):
        model, optimizer, train_loader = dp_wrapper.make_private(model, optimizer, train_loader)

    return HospitalClient(model, train_loader, test_loader, dp_wrapper, optimizer, config)


if __name__ == "__main__":
    client = setup_client()
    fl.client.start_client(
        server_address=load_config().get("server_url", "localhost:8080"),
        client=client.to_client(),
    )
