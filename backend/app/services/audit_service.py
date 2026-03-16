import json
import os
from datetime import datetime

AUDIT_LOG_FILE = "audit_logs.json"

def log_action(role: str, action: str, resource: str, status: str):
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "role": role,
        "action": action,
        "resource": resource,
        "status": status
    }
    
    logs = []
    if os.path.exists(AUDIT_LOG_FILE):
        with open(AUDIT_LOG_FILE, "r") as f:
            try:
                logs = json.load(f)
            except:
                pass
                
    logs.append(log_entry)
    
    with open(AUDIT_LOG_FILE, "w") as f:
        json.dump(logs, f, indent=4)

def get_logs():
    if os.path.exists(AUDIT_LOG_FILE):
        with open(AUDIT_LOG_FILE, "r") as f:
            return json.load(f)
    return []
