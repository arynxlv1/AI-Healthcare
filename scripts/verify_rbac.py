import httpx
import asyncio

async def test_rbac():
    base_url = "http://127.0.0.1:8000"
    
    test_cases = [
        {"role": "patient", "path": "/api/ai/diagnose", "expected": 200},
        {"role": "patient", "path": "/api/triage/queue", "expected": 403},
        {"role": "doctor", "path": "/api/triage/queue", "expected": 200},
        {"role": "doctor", "path": "/api/fl/status", "expected": 403},
        {"role": "hospital_admin", "path": "/api/fl/status", "expected": 200},
        {"role": "super_admin", "path": "/api/fl/status", "expected": 200},
    ]
    
    print("Starting RBAC Cross-Role Access Checks...")
    async with httpx.AsyncClient() as client:
        for case in test_cases:
            headers = {"X-Role": case["role"]}
            # Use appropriate method (POST for diagnose, GET for others)
            method = "POST" if "diagnose" in case["path"] else "GET"
            
            try:
                if method == "POST":
                    response = await client.post(f"{base_url}{case['path']}", headers=headers, json={"symptoms": ["cough"]})
                else:
                    response = await client.get(f"{base_url}{case['path']}", headers=headers)
                
                status = response.status_code
                result = "✅ PASS" if status == case["expected"] else "❌ FAIL"
                print(f"Role: {case['role']:15} | Path: {case['path']:20} | Expected: {case['expected']} | Got: {status} | {result}")
            except Exception as e:
                print(f"Error testing {case['path']}: {e}")

if __name__ == "__main__":
    asyncio.run(test_rbac())
