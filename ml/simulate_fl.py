import flwr as fl
import torch
import numpy as np
from typing import Dict, List, Tuple
from model import DiseaseClassifier, get_model_params, set_model_params
import torch.nn as nn
import torch.optim as optim

# Mock Data Generation (Simulating Hospital Datasets)
def load_data(partition_id: int):
    # In a real scenario, this would load from CSV/FHIR
    # For simulation, we create synthetic symptom vectors (e.g., 100 symptoms)
    input_dim = 100
    num_classes = 10
    num_samples = 200
    
    X = torch.randn(num_samples, input_dim)
    # Give different hospitals slightly different data biases
    y = torch.randint(0, num_classes, (num_samples,))
    
    # Split into train/test
    train_split = int(num_samples * 0.8)
    return (X[:train_split], y[:train_split]), (X[train_split:], y[train_split:])

class FlowerClient(fl.client.NumPyClient):
    def __init__(self, model, train_data, test_data):
        self.model = model
        self.train_X, self.train_y = train_data
        self.test_X, self.test_y = test_data
        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)

    def get_parameters(self, config):
        return get_model_params(self.model)

    def fit(self, parameters, config):
        set_model_params(self.model, parameters)
        self.model.train()
        for epoch in range(3): # Local epochs
            self.optimizer.zero_grad()
            outputs = self.model(self.train_X)
            loss = self.criterion(outputs, self.train_y)
            loss.backward()
            self.optimizer.step()
        return get_model_params(self.model), len(self.train_X), {}

    def evaluate(self, parameters, config):
        set_model_params(self.model, parameters)
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(self.test_X)
            loss = self.criterion(outputs, self.test_y)
            _, predicted = torch.max(outputs.data, 1)
            accuracy = (predicted == self.test_y).sum().item() / len(self.test_y)
        return float(loss), len(self.test_X), {"accuracy": float(accuracy)}

def client_fn(cid: str) -> fl.client.Client:
    model = DiseaseClassifier(100, 64, 10)
    train_data, test_data = load_data(int(cid))
    return FlowerClient(model, train_data, test_data).to_client()

def run_simulation():
    print("Starting Federated Learning Simulation...")
    # FedAvg Strategy
    strategy = fl.server.strategy.FedAvg(
        fraction_fit=1.0,
        min_fit_clients=3,
        min_available_clients=3,
        evaluate_metrics_aggregation_fn=weighted_average,
    )

    fl.simulation.start_simulation(
        client_fn=client_fn,
        num_clients=3,
        config=fl.server.ServerConfig(num_rounds=5),
        strategy=strategy,
    )

def weighted_average(metrics: List[Tuple[int, Dict]]) -> Dict:
    accuracies = [num_examples * m["accuracy"] for num_examples, m in metrics]
    examples = [num_examples for num_examples, _ in metrics]
    return {"accuracy": sum(accuracies) / sum(examples)}

if __name__ == "__main__":
    run_simulation()
