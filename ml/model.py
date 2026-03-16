import torch
import torch.nn as nn
import torch.nn.functional as F

class DiseaseClassifier(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_classes):
        super(DiseaseClassifier, self).__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim * 2)
        self.bn1 = nn.BatchNorm1d(hidden_dim * 2)
        self.fc2 = nn.Linear(hidden_dim * 2, hidden_dim)
        self.bn2 = nn.BatchNorm1d(hidden_dim)
        self.fc3 = nn.Linear(hidden_dim, num_classes)
        self.dropout = nn.Dropout(0.2)
        
    def forward(self, x):
        x = F.relu(self.bn1(self.fc1(x)))
        x = self.dropout(x)
        x = F.relu(self.bn2(self.fc2(x)))
        x = self.dropout(x)
        x = self.fc3(x)
        return x

def get_model_params(model):
    return [val.cpu().numpy() for _, val in model.state_dict().items()]

def set_model_params(model, params):
    params_dict = zip(model.state_dict().keys(), params)
    state_dict = {k: torch.tensor(v) for k, v in params_dict}
    model.load_state_dict(state_dict, strict=True)
