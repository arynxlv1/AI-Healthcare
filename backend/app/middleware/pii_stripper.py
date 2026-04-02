"""
PII stripper — removes personally identifiable information from symptom text
before it is stored or sent to the LLM.

Known limitations (documented, not hidden):
- NAME detection only catches titled/prefixed names (Dr. Smith, Patient: Jane Doe).
  Bare first/last name pairs without a prefix are not caught — NER would be needed.
- PHONE pattern requires a clear delimiter (space, dash, parens) to reduce false
  positives on medical values like dosages, lab ranges, and blood pressure readings.
"""
import re

# Ordered most-specific → least-specific to avoid partial replacements.
# Each tuple is (label, pattern).
_PII_PATTERNS = [
    # Email — most specific, run first
    ("EMAIL",  r'[\w\.\+\-]+@[\w\.\-]+\.\w{2,}'),

    # NHS / SSN-style numbers: exactly NNN-NNN-NNNN with delimiters
    ("NHS_NO", r'\b\d{3}[\s\-]\d{3}[\s\-]\d{4}\b'),

    # Dates: DD/MM/YYYY, MM-DD-YY, etc.
    ("DOB",    r'\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b'),

    # Phone: requires at least one non-digit delimiter (space, dash, parens)
    # to avoid matching dosages like "500mg", lab values "120/80", or "10-15 units"
    ("PHONE",  r'\+?(?:\d[\s\-\(\)]){9,}\d'),

    # Titled/prefixed names only — avoids false positives on medical terminology
    ("NAME",   r'\b(?:patient|name|dr\.?|doctor|mr\.?|mrs\.?|ms\.?|miss)\s*:?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*'),
]

_COMPILED = [(label, re.compile(pattern, re.IGNORECASE)) for label, pattern in _PII_PATTERNS]


def strip_pii(text: str) -> str:
    """Remove PII patterns from text. Returns cleaned string."""
    clean = text
    for label, pattern in _COMPILED:
        clean = pattern.sub(f"[{label}_REDACTED]", clean)
    return clean
