import flwr as fl
import torch
import torch.nn as nn
import torch.optim as optim
from opacus import PrivacyEngine
import yaml
import os
import sys

# Add root to path to import model
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from ml.model import DiseaseClassifier, get_model_params, set_model_params

class HospitalClient(fl.client.NumPyClient):
    def __init__(self, model, train_loader, test_loader, privacy_engine, optimizer, config):
        self.model = model
        self.train_loader = train_loader
        self.test_loader = test_loader
        self.privacy_engine = privacy_engine
        self.optimizer = optimizer
        self.config = config
        self.criterion = nn.CrossEntropyLoss()

    def get_parameters(self, config):
        return get_model_params(self.model)

    def fit(self, parameters, config):
        set_model_params(self.model, parameters)
        self.model.train()
        
        for _ in range(self.config['local_epochs']):
            for batch in self.train_loader:
                images, labels = batch
                self.optimizer.zero_grad()
                outputs = self.model(images)
                loss = self.criterion(outputs, labels)
                loss.backward()
                self.optimizer.step()
        
        # Calculate epsilon for privacy accounting
        epsilon = self.privacy_engine.get_epsilon(delta=self.config['delta'])
        print(f"Local training complete. Privacy budget used (ε): {epsilon:.2f}")
        
        return get_model_params(self.model), len(self.train_loader.dataset), {"epsilon": epsilon}

    def evaluate(self, parameters, config):
        set_model_params(self.model, parameters)
        self.model.eval()
        correct, total, loss = 0, 0, 0.0
        with torch.no_grad():
            for batch in self.test_loader:
                images, labels = batch
                outputs = self.model(images)
                loss += self.criterion(outputs, labels).item()
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
        
        accuracy = correct / total
        return float(loss / len(self.test_loader)), total, {"accuracy": float(accuracy)}

def load_config():
    with open("fl_client/config.yaml", "r") as f:
        return yaml.safe_load(f)

def setup_client():
    config = load_config()
    
    # Initialize model (matching baseline)
    model = DiseaseClassifier(input_dim=100, hidden_dim=64, num_classes=10)
    optimizer = optim.Adam(model.parameters(), lr=config['learning_rate'])
    
    # Mock DataLoader (In production, this loads CSV/FHIR)
    # 100 features, 32 batch size
    X_train = torch.randn(200, 100)
    y_train = torch.randint(0, 10, (200,))
    train_ds = torch.utils.data.TensorDataset(X_train, y_train)
    train_loader = torch.utils.data.DataLoader(train_ds, batch_size=config['batch_size'])
    
    X_test = torch.randn(50, 100)
    y_test = torch.randint(0, 10, (50,))
    test_ds = torch.utils.data.TensorDataset(X_test, y_test)
    test_loader = torch.utils.data.DataLoader(test_ds, batch_size=config['batch_size'])

    # Initialize Opacus Privacy Engine
    privacy_engine = PrivacyEngine()
    model, optimizer, train_loader = privacy_engine.make_private(
        module=model,
        optimizer=optimizer,
        data_loader=train_loader,
        noise_multiplier=1.1, # Derived from target epsilon
        max_grad_norm=config['max_grad_norm'],
    )
    
    return HospitalClient(model, train_loader, test_loader, privacy_engine, optimizer, config)

if __name__ == "__main__":
    client = setup_client()
    fl.client.start_client(server_address="localhost:8080", client=client.to_client())
