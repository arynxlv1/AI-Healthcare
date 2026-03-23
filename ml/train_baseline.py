"""
Train a disease classifier on a synthetic but medically-grounded dataset.
Symptoms map to the same 100-symptom vocabulary in backend/app/core/mapping.py.
Run from the project root: python ml/train_baseline.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from model import DiseaseClassifier

# ── Disease labels (10 classes, index = class id) ──────────────────────────
DISEASES = [
    "Influenza",
    "Common Cold",
    "Pneumonia",
    "COVID-19",
    "Asthma",
    "Migraine",
    "Gastroenteritis",
    "Urinary Tract Infection",
    "Hypertensive Crisis",
    "Cardiac Event",
]

# ── Symptom vocabulary (must match backend/app/core/mapping.py exactly) ────
SYMPTOMS = [
    "chest-pain", "shortness-of-breath", "cough", "fever", "headache",
    "body-ache", "sneeze", "sore-throat", "fatigue", "nausea",
    "vomiting", "diarrhea", "abdominal-pain", "back-pain", "joint-pain",
    "muscle-weakness", "dizziness", "fainting", "palpitations", "sweating",
    "chills", "loss-of-appetite", "weight-loss", "weight-gain", "bloating",
    "constipation", "blood-in-stool", "blood-in-urine", "frequent-urination", "painful-urination",
    "skin-rash", "itching", "jaundice", "swollen-lymph-nodes", "neck-stiffness",
    "vision-blurred", "vision-loss", "eye-pain", "ear-pain", "hearing-loss",
    "ringing-in-ears", "runny-nose", "nasal-congestion", "loss-of-smell", "loss-of-taste",
    "mouth-sores", "difficulty-swallowing", "hoarseness", "wheezing", "coughing-blood",
    "chest-tightness", "rapid-breathing", "irregular-heartbeat", "high-blood-pressure", "low-blood-pressure",
    "swollen-ankles", "swollen-legs", "cold-hands", "cold-feet", "numbness",
    "tingling", "tremors", "seizures", "confusion", "memory-loss",
    "difficulty-speaking", "difficulty-walking", "loss-of-balance", "anxiety", "depression",
    "insomnia", "excessive-sleep", "night-sweats", "hot-flashes", "hair-loss",
    "brittle-nails", "dry-skin", "bruising-easily", "slow-healing-wounds", "frequent-infections",
    "swollen-glands", "enlarged-spleen", "enlarged-liver", "dark-urine", "pale-stools",
    "rectal-bleeding", "pelvic-pain", "irregular-periods", "heavy-periods", "missed-period",
    "breast-pain", "decreased-libido", "increased-thirst", "increased-hunger", "excessive-urination",
    "muscle-cramps", "bone-pain", "hip-pain", "knee-pain", "ankle-pain",
]
SYM_IDX = {s: i for i, s in enumerate(SYMPTOMS)}

def vec(symptom_list):
    v = [0.0] * 100
    for s in symptom_list:
        if s in SYM_IDX:
            v[SYM_IDX[s]] = 1.0
    return v

# ── Medically-grounded symptom profiles per disease ────────────────────────
PROFILES = {
    0: ["fever", "body-ache", "fatigue", "headache", "chills", "sore-throat", "cough", "sweating"],
    1: ["runny-nose", "sneeze", "sore-throat", "cough", "nasal-congestion", "fatigue", "headache"],
    2: ["cough", "fever", "shortness-of-breath", "chest-pain", "fatigue", "rapid-breathing", "sweating", "chills"],
    3: ["fever", "cough", "loss-of-smell", "loss-of-taste", "fatigue", "shortness-of-breath", "body-ache", "headache"],
    4: ["wheezing", "shortness-of-breath", "chest-tightness", "cough", "rapid-breathing"],
    5: ["headache", "vision-blurred", "nausea", "vomiting", "dizziness", "sensitivity-to-light"],
    6: ["nausea", "vomiting", "diarrhea", "abdominal-pain", "fever", "loss-of-appetite", "bloating"],
    7: ["painful-urination", "frequent-urination", "blood-in-urine", "pelvic-pain", "fever", "back-pain"],
    8: ["high-blood-pressure", "headache", "dizziness", "vision-blurred", "chest-pain", "palpitations", "anxiety"],
    9: ["chest-pain", "shortness-of-breath", "palpitations", "sweating", "fainting", "irregular-heartbeat", "nausea"],
}

def generate_dataset(n_per_class=300):
    X, y = [], []
    rng = np.random.default_rng(42)
    for cls, core_symptoms in PROFILES.items():
        for _ in range(n_per_class):
            # Always include core symptoms with some dropout
            active = [s for s in core_symptoms if rng.random() > 0.15]
            # Add 0-3 random noise symptoms
            noise_count = rng.integers(0, 4)
            noise = rng.choice([s for s in SYMPTOMS if s not in core_symptoms], noise_count, replace=False).tolist()
            X.append(vec(active + noise))
            y.append(cls)
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)

def train():
    print("Generating synthetic medical dataset...")
    X_np, y_np = generate_dataset(n_per_class=400)
    X = torch.tensor(X_np)
    y = torch.tensor(y_np)

    print(f"Dataset: {len(X)} samples, {len(DISEASES)} classes, {X.shape[1]} features")

    model = DiseaseClassifier(input_dim=100, hidden_dim=64, num_classes=10)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.005, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=20, gamma=0.5)

    model.train()
    for epoch in range(60):
        # Mini-batch training
        perm = torch.randperm(len(X))
        total_loss = 0
        for i in range(0, len(X), 64):
            idx = perm[i:i+64]
            optimizer.zero_grad()
            out = model(X[idx])
            loss = criterion(out, y[idx])
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        scheduler.step()
        if epoch % 10 == 0:
            model.eval()
            with torch.no_grad():
                preds = model(X).argmax(dim=1)
                acc = (preds == y).float().mean().item()
            print(f"Epoch {epoch:3d} | Loss: {total_loss:.3f} | Train Acc: {acc:.3f}")
            model.train()

    # Final accuracy
    model.eval()
    with torch.no_grad():
        preds = model(X).argmax(dim=1)
        acc = (preds == y).float().mean().item()
    print(f"\nFinal train accuracy: {acc:.3f}")

    # Export to ONNX using legacy exporter (avoids onnxscript issues on Python 3.14)
    out_path = os.path.join(os.path.dirname(__file__), "model.onnx")
    dummy = torch.randn(1, 100)
    # Remove stale external data file if present
    data_path = out_path + ".data"
    if os.path.exists(data_path):
        os.remove(data_path)
    with torch.no_grad():
        torch.onnx.export(
            model, dummy, out_path,
            export_params=True, opset_version=17,
            do_constant_folding=True,
            input_names=["input"], output_names=["output"],
            dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
            dynamo=False,
        )
    print(f"Model exported to {out_path}")

    # Save disease labels alongside model
    import json
    labels_path = os.path.join(os.path.dirname(__file__), "disease_labels.json")
    with open(labels_path, "w") as f:
        json.dump(DISEASES, f, indent=2)
    print(f"Labels saved to {labels_path}")

if __name__ == "__main__":
    train()
