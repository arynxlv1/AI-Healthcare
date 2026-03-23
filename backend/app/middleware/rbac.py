from fastapi import Request, HTTPException, status
from ..services.auth_service import AuthService
from ..services.audit_service import log_action

# Paths each role is permitted to access (prefix-matched)
ROLES_PERMISSION: dict[str, list[str]] = {
    "patient":        ["/api/auth", "/api/ai"],
    "doctor":         ["/api/auth", "/api/ai", "/api/triage"],
    "hospital_admin": ["/api/auth", "/api/fl", "/ws/fl"],
    "super_admin":    ["/api/auth", "/api/ai", "/api/triage", "/api/fl", "/api/audit", "/api/train", "/ws/fl"],
}

# Paths that are always public (no JWT required)
PUBLIC_PATHS = ["/api/auth/login", "/health", "/"]

# WebSocket paths — token comes as query param, not Authorization header
WS_PATHS = ["/ws/"]


async def rbac_middleware(request: Request, call_next):
    path = request.url.path

    # Always allow public paths
    if any(path.startswith(p) for p in PUBLIC_PATHS):
        return await call_next(request)

    # For WebSocket upgrades, token is in query param — let the endpoint handle auth
    if any(path.startswith(p) for p in WS_PATHS):
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    role = "anonymous"
    hospital_id = None
    user_id = None

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        payload = AuthService.decode_token(token)
        if payload:
            role = payload.get("role", "anonymous")
            hospital_id = payload.get("hospital_id")
            user_id = payload.get("sub")
            request.state.user_role = role
            request.state.hospital_id = hospital_id
            request.state.user_id = user_id

    # Unauthenticated request to a protected path
    if role == "anonymous":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Super admin bypasses all checks
    if role == "super_admin":
        return await call_next(request)

    allowed_prefixes = ROLES_PERMISSION.get(role, [])
    is_allowed = any(path.startswith(p) for p in allowed_prefixes)

    if not is_allowed:
        log_action(
            user_id=user_id or role,
            action="ACCESS_DENIED",
            resource_type="endpoint",
            resource_id=path,
            details={"method": request.method, "role": role},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not authorized to access {path}",
        )

    return await call_next(request)
