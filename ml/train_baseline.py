import torch
import torch.nn as nn
import torch.optim as optim
from model import DiseaseClassifier
import numpy as np

def train_and_export():
    print("Training baseline model...")
    # Matches simulation params: 100 features, 64 hidden, 10 classes
    input_dim = 100
    hidden_dim = 64
    num_classes = 10
    model = DiseaseClassifier(input_dim, hidden_dim, num_classes)
    
    # Synthetic dataset
    X = torch.randn(1000, input_dim)
    y = torch.randint(0, num_classes, (1000,))
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    model.train()
    for epoch in range(10):
        optimizer.zero_grad()
        outputs = model(X)
        loss = criterion(outputs, y)
        loss.backward()
        optimizer.step()
        if epoch % 2 == 0:
            print(f"Epoch {epoch}, Loss: {loss.item():.4f}")

    # Export to ONNX
    print("Exporting model to ONNX...")
    model.eval()
    dummy_input = torch.randn(1, input_dim)
    torch.onnx.export(
        model,
        dummy_input,
        "ml/model.onnx",
        export_params=True,
        opset_version=12,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    print("Model exported to ml/model.onnx")

if __name__ == "__main__":
    train_and_export()
