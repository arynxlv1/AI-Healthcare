import sys
import os
# Add project root to sys.path to allow imports from backend.app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.services.pii_stripper import PIIStripper

def test_pii_stripper():
    stripper = PIIStripper()
    
    test_cases = [
        {
            "name": "NHS Number",
            "input": "Patient NHS number is 485 772 1049.",
            "contains_not": "485 772 1049"
        },
        {
            "name": "Date of Birth",
            "input": "Patient born on 12/05/1985.",
            "contains_not": "12/05/1985"
        },
        {
            "name": "Phone Number",
            "input": "Contact patient at 07700900123.",
            "contains_not": "07700900123"
        },
        {
            "name": "Names (NER)",
            "input": "Mr. John Smith was seen at St. Thomas Hospital.",
            "contains_not": "John Smith"
        },
        {
            "name": "Email",
            "input": "Send results to john.doe123@gmail.com.",
            "contains_not": "john.doe123@gmail.com"
        },
        {
            "name": "Complex Case",
            "input": "Alice Thompson (NHS: 123 456 7890) from London was admitted. Contact 07123456789.",
            "contains_not": ["Alice", "Thompson", "123 456 7890", "07123456789"]
        }
    ]

    print(f"{'Test Case':<20} | {'Status':<10}")
    print("-" * 35)
    
    for case in test_cases:
        output = stripper.strip(case["input"])
        
        # Check if any forbidden strings are in output
        forbidden = case["contains_not"]
        if isinstance(forbidden, str):
            forbidden = [forbidden]
            
        success = True
        for item in forbidden:
            if item.lower() in output.lower():
                success = False
                break
        
        status = "PASSED" if success else "FAILED"
        print(f"{case['name']:<20} | {status:<10}")
        if not success:
            print(f"  -> Input: {case['input']}")
            print(f"  -> Output: {output}")

if __name__ == "__main__":
    test_pii_stripper()
