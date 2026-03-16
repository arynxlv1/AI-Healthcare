import httpx
import asyncio
import json

async def verify_security():
    base_url = "http://127.0.0.1:8000"
    
    print("\n--- 1. Hospital RLS Leakage Check ---")
    async with httpx.AsyncClient() as client:
        # Doctor from Hospital 1
        res1 = await client.get(f"{base_url}/api/triage/queue", headers={"X-Role": "doctor", "X-Hospital-ID": "HOSP_001"})
        cases1 = res1.json()
        print(f"Hospital 1 Doctor saw {len(cases1)} cases. Case IDs: {[c['id'] for c in cases1]}")
        
        # Doctor from Hospital 2
        res2 = await client.get(f"{base_url}/api/triage/queue", headers={"X-Role": "doctor", "X-Hospital-ID": "HOSP_002"})
        cases2 = res2.json()
        print(f"Hospital 2 Doctor saw {len(cases2)} cases. Case IDs: {[c['id'] for c in cases2]}")
        
        leak = any(c['id'] in [ca['id'] for ca in cases1] for c in cases2)
        print("✅ PASS: No leakage between hospitals" if not leak else "❌ FAIL: Data leakage detected!")

    print("\n--- 2. Audit Log Persistence Check ---")
    if os.path.exists("audit_logs.json"):
        with open("audit_logs.json", "r") as f:
            logs = json.load(f)
            print(f"Verified {len(logs)} entries in audit_logs.json")
            for entry in logs[-3:]: # Show last 3
                print(f"[{entry['timestamp']}] {entry['role']} | {entry['action']} {entry['resource']} -> {entry['status']}")
        print("✅ PASS: Audit logging persistent")
    else:
        print("❌ FAIL: Audit logs not found")

if __name__ == "__main__":
    import os
    asyncio.run(verify_security())
