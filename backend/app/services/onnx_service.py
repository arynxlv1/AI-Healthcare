import onnxruntime as ort
import numpy as np
import os
from typing import List, Dict, Any
import time

class ONNXService:
    def __init__(self, model_path: str = "ml/model.onnx"):
        self.model_path = model_path
        if not os.path.exists(model_path):
            print(f"Warning: ONNX model not found at {model_path}")
            self.session = None
        else:
            # Using CPU provider for stability on Windows as per plan
            self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
            self.input_name = self.session.get_inputs()[0].name
            self.output_name = self.session.get_outputs()[0].name

    def predict(self, symptom_vector: List[float]) -> Dict[str, Any]:
        """
        Runs Stage 1 prediction (Classification).
        Returns top-5 predictions and urgency.
        """
        if not self.session:
            return {"error": "Model not loaded", "status": "fallback_triggered"}

        start_time = time.time()
        
        # Prepare input
        input_data = np.array([symptom_vector], dtype=np.float32)
        
        # Run inference
        outputs = self.session.run([self.output_name], {self.input_name: input_data})
        probabilities = self.softmax(outputs[0][0])
        
        # Process results
        top_indices = np.argsort(probabilities)[-5:][::-1]
        
        latency = (time.time() - start_time) * 1000
        
        # Contingency check (Senior Dev Requirement: 100ms threshold)
        status = "normal"
        if latency > 100:
            status = "contingency_triggered"

        # Mock ICD-10 mapping for demonstration
        # In real scenario, this would be a lookup table
        mock_diseases = [
            "Influenza", "Common Cold", "Pneumonia", "Bronchitis", "COVID-19",
            "Asthma", "Allergy", "Sinusitis", "Tuberculosis", "Migraine"
        ]

        predictions = []
        for idx in top_indices:
            predictions.append({
                "label": mock_diseases[idx] if idx < len(mock_diseases) else f"Unknown_{idx}",
                "probability": float(probabilities[idx])
            })

        # Calculate Urgency
        max_prob = float(probabilities[top_indices[0]])
        urgency = "low"
        if max_prob > 0.8: urgency = "high"
        elif max_prob > 0.5: urgency = "medium"

        return {
            "predictions": predictions,
            "urgency": urgency,
            "latency_ms": latency,
            "status": status
        }

    @staticmethod
    def softmax(x):
        e_x = np.exp(x - np.max(x))
        return e_x / e_x.sum()

onnx_service = ONNXService()
