import onnxruntime as ort
import numpy as np
import os
import json
import pathlib
import time
from typing import List, Dict, Any

_ROOT = pathlib.Path(__file__).parent.parent.parent.parent

# Risk metadata per disease — drives the UI risk badge and immediate steps
DISEASE_META: Dict[str, Dict] = {
    "Influenza": {
        "risk": "medium",
        "steps": ["Rest and stay hydrated", "Take fever-reducing medication (paracetamol/ibuprofen)", "Isolate to avoid spreading", "See a doctor if symptoms worsen after 3 days"],
    },
    "Common Cold": {
        "risk": "low",
        "steps": ["Rest and drink plenty of fluids", "Use saline nasal spray for congestion", "Throat lozenges for sore throat", "Monitor for secondary infections"],
    },
    "Pneumonia": {
        "risk": "high",
        "steps": ["Seek medical attention immediately", "Do not delay — antibiotics may be required", "Monitor oxygen levels if possible", "Avoid strenuous activity"],
    },
    "COVID-19": {
        "risk": "high",
        "steps": ["Isolate immediately for at least 5 days", "Monitor oxygen saturation (below 94% → ER)", "Stay hydrated and rest", "Contact your doctor for antiviral options"],
    },
    "Asthma": {
        "risk": "medium",
        "steps": ["Use your rescue inhaler immediately", "Sit upright and stay calm", "If no improvement in 15 min → call emergency services", "Identify and remove the trigger"],
    },
    "Migraine": {
        "risk": "low",
        "steps": ["Move to a quiet, dark room", "Apply cold compress to forehead", "Take prescribed migraine medication early", "Stay hydrated and avoid screens"],
    },
    "Gastroenteritis": {
        "risk": "low",
        "steps": ["Rehydrate with oral rehydration salts (ORS)", "Eat bland foods (BRAT diet)", "Avoid dairy and fatty foods", "Seek care if vomiting persists > 24 hours"],
    },
    "Urinary Tract Infection": {
        "risk": "medium",
        "steps": ["See a doctor for antibiotic prescription", "Drink plenty of water", "Avoid caffeine and alcohol", "Do not delay treatment — can spread to kidneys"],
    },
    "Hypertensive Crisis": {
        "risk": "critical",
        "steps": ["Call emergency services (999/911) immediately", "Sit down and stay calm", "Do not take extra blood pressure medication without guidance", "Avoid physical exertion"],
    },
    "Cardiac Event": {
        "risk": "critical",
        "steps": ["Call 999/911 immediately — this is a medical emergency", "Chew aspirin (300mg) if not allergic", "Sit or lie down in a comfortable position", "Do not eat or drink anything"],
    },
}


class ONNXService:
    def __init__(self, model_path: str = str(_ROOT / "ml" / "model.onnx")):
        self.model_path = model_path
        self.session = None
        self.disease_labels: List[str] = []

        labels_path = str(_ROOT / "ml" / "disease_labels.json")
        if os.path.exists(labels_path):
            with open(labels_path) as f:
                self.disease_labels = json.load(f)

        if not os.path.exists(model_path):
            print(f"Warning: ONNX model not found at {model_path}")
        else:
            self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
            self.input_name = self.session.get_inputs()[0].name
            self.output_name = self.session.get_outputs()[0].name
            print(f"ONNX model loaded: {len(self.disease_labels)} disease classes")

    def predict(self, symptom_vector: List[float]) -> Dict[str, Any]:
        if not self.session:
            # Graceful fallback when model isn't loaded
            return {
                "predictions": [{"label": "Unknown", "probability": 0.0}],
                "urgency": "low",
                "latency_ms": 0,
                "status": "fallback_triggered",
            }

        start = time.time()
        input_data = np.array([symptom_vector], dtype=np.float32)
        outputs = self.session.run([self.output_name], {self.input_name: input_data})
        probs = self._softmax(outputs[0][0])
        latency = (time.time() - start) * 1000

        top_indices = np.argsort(probs)[::-1][:5]

        predictions = []
        for idx in top_indices:
            label = self.disease_labels[idx] if idx < len(self.disease_labels) else f"Disease_{idx}"
            predictions.append({
                "label": label,
                "probability": round(float(probs[idx]), 4),
                "percentage": round(float(probs[idx]) * 100, 1),
            })

        top_label = predictions[0]["label"]
        meta = DISEASE_META.get(top_label, {"risk": "low", "steps": ["Consult a healthcare professional"]})

        # Urgency from risk level
        risk_to_urgency = {"critical": "high", "high": "high", "medium": "medium", "low": "low"}
        urgency = risk_to_urgency.get(meta["risk"], "low")

        return {
            "predictions": predictions,
            "urgency": urgency,
            "risk_level": meta["risk"],
            "immediate_steps": meta["steps"],
            "latency_ms": round(latency, 2),
            "status": "normal",
        }

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        e = np.exp(x - np.max(x))
        return e / e.sum()


onnx_service = ONNXService()
