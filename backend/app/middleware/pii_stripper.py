import re

def strip_pii(text: str) -> str:
    # Basic Regex for demo PII stripping
    # Names are harder without NER, but we can do DOB, Phone, Email
    patterns = {
        "EMAIL": r'[\w\.-]+@[\w\.-]+\.\w+',
        "PHONE": r'\+?\d{10,12}',
        "DOB": r'\d{2}/\d{2}/\d{4}',
        "NHS_NO": r'\d{3}-\d{3}-\d{4}'
    }
    
    clean_text = text
    for label, pattern in patterns.items():
        clean_text = re.sub(pattern, f"[{label}_REDACTED]", clean_text)
        
    return clean_text
