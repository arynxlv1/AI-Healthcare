import json
import os

# 50 Synthetic ICD-10-CM entries for Federated Health AI RAG validation
medical_data = [
    {"code": "J11.1", "description": "Influenza due to unidentified influenza virus with other respiratory manifestations."},
    {"code": "J00", "description": "Acute nasopharyngitis [common cold]. Symptoms: runny nose, sneezing, sore throat."},
    {"code": "J18.9", "description": "Pneumonia, unspecified organism. Inflammation of one or both lungs with fluid."},
    {"code": "U07.1", "description": "COVID-19, virus identified. Respiratory syndrome caused by SARS-CoV-2."},
    {"code": "I10", "description": "Essential (primary) hypertension. High blood pressure without identifiable cause."},
    {"code": "E11.9", "description": "Type 2 diabetes mellitus without complications. Blood sugar regulation issues."},
    {"code": "G43.909", "description": "Migraine, unspecified, not intractable, without status migrainosus. Severe headache."},
    {"code": "M54.5", "description": "Low back pain. Pain in the lumbar region of the spine."},
    {"code": "L20.9", "description": "Atopic dermatitis, unspecified. Itchy, inflamed skin (eczema)."},
    {"code": "K21.9", "description": "Gastro-esophageal reflux disease without esophagitis. Heartburn or acid reflux."},
]

# Expanding to 50 items for realistic retrieval simulation
for i in range(11, 51):
    medical_data.append({
        "code": f"Z01.{i}",
        "description": f"Synthetic medical condition {i}: Patient presents with phantom symptoms for testing RAG retrieval logic."
    })

def generate():
    output_path = "scripts/synthetic_medical_kb.json"
    os.makedirs("scripts", exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(medical_data, f, indent=4)
    print(f"Generated 50 synthetic medical records at {output_path}")

if __name__ == "__main__":
    generate()
