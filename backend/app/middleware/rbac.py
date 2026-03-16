from fastapi import Request, HTTPException, status
from functools import wraps
from typing import List

# Mock Role Matrix enforcement for demo
ROLES_PERMISSION = {
    "patient": ["/api/auth", "/api/ai/diagnose"],
    "doctor": ["/api/auth", "/api/ai/diagnose", "/api/triage/queue", "/api/triage/confirm"],
    "hospital_admin": ["/api/auth", "/api/fl/status"],
    "super_admin": ["*"]
}

from ..services.audit_service import log_action

async def rbac_middleware(request: Request, call_next):
    # In a real app, we'd extract the role from the JWT token
    role = request.headers.get("X-Role", "anonymous")
    path = request.url.path
    
    if role == "super_admin":
        response = await call_next(request)
        log_action(role, request.method, path, "ALLOWED")
        return response
        
    allowed_paths = ROLES_PERMISSION.get(role, [])
    is_allowed = any(path.startswith(p) for p in allowed_paths)
    
    if not is_allowed and role != "anonymous":
         log_action(role, request.method, path, "DENIED")
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not authorized to access {path}"
        )
        
    response = await call_next(request)
    if role != "anonymous":
        log_action(role, request.method, path, "ALLOWED")
    return response
