import re

# Ordered from most specific to least to avoid partial replacements
_PII_PATTERNS = [
    ("EMAIL",   r'[\w\.\+\-]+@[\w\.\-]+\.\w{2,}'),
    ("NHS_NO",  r'\b\d{3}[\s\-]\d{3}[\s\-]\d{4}\b'),
    ("DOB",     r'\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b'),
    ("PHONE",   r'\+?[\d\s\-\(\)]{10,15}'),
    # "Patient: Name" or "Name:" prefix patterns
    ("NAME",    r'\b(?:patient|name|dr\.?|doctor|mr\.?|mrs\.?|ms\.?|miss)\s*:?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*'),
]

_COMPILED = [(label, re.compile(pattern, re.IGNORECASE)) for label, pattern in _PII_PATTERNS]


def strip_pii(text: str) -> str:
    """Remove PII patterns from text. Returns cleaned string."""
    clean = text
    for label, pattern in _COMPILED:
        clean = pattern.sub(f"[{label}_REDACTED]", clean)
    return clean
