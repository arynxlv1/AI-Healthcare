# Fixed 100-symptom vocabulary — positions are stable and must not be reordered.
# The ONNX model was trained against this exact ordering.
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

assert len(SYMPTOMS) == 100, f"Vocabulary must be exactly 100 symptoms, got {len(SYMPTOMS)}"

_SYMPTOM_INDEX = {s: i for i, s in enumerate(SYMPTOMS)}


def map_symptoms_to_vector(symptoms: list[str]) -> list[float]:
    """Converts a list of symptom strings to a fixed-length binary float vector of length 100.

    - Order-independent: the same set of symptoms always produces the same vector.
    - Unknown symptoms are silently ignored (position stays 0.0).
    - Always returns exactly 100 floats.
    """
    vector = [0.0] * 100
    for s in symptoms:
        idx = _SYMPTOM_INDEX.get(s)
        if idx is not None:
            vector[idx] = 1.0
    return vector
