import spacy
import re
from typing import List

class PIIStripper:
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            # Fallback for if model isn't downloaded yet in certain environments
            self.nlp = None

        # Regex patterns for clinical PII
        self.patterns = {
            "NHS_NUMBER": r"\b\d{3}[- ]?\d{3}[- ]?\d{4}\b",
            "DOB": r"\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b",
            "PHONE": r"\b(\+?44|0)7\d{9}\b",
            "POSTCODE": r"\b([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b",
            "EMAIL": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
        }

    def strip(self, text: str) -> str:
        if not text:
            return ""

        # 1. Regex Anonymization
        for label, pattern in self.patterns.items():
            text = re.sub(pattern, f"[REDACTED_{label}]", text)

        # 2. Named Entity Recognition (NER)
        if self.nlp:
            doc = self.nlp(text)
            # Create list of replacements to avoid indexing issues during mutation
            replacements = []
            for ent in doc.ents:
                if ent.label_ in ["PERSON", "GPE", "FAC", "ORG"]:
                    replacements.append((ent.start_char, ent.end_char, f"[REDACTED_{ent.label_}]"))
            
            # Apply replacements from end to start to maintain index validity
            for start, end, label in sorted(replacements, key=lambda x: x[0], reverse=True):
                text = text[:start] + label + text[end:]

        return text

    def strip_batch(self, texts: List[str]) -> List[str]:
        return [self.strip(t) for t in texts]
