"""
Audit service — logs actions to the audit_logs table.

Accepts an optional SQLAlchemy Session. When provided, it reuses the
request-scoped session (no extra connection). When omitted (e.g. from
middleware where no session is available), it opens a short-lived one.
"""
from sqlalchemy.orm import Session
from ..core.database import SessionLocal
from ..models.models import AuditLog


def log_action(
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
    db: Session | None = None,
) -> None:
    """
    Write an audit log entry.

    Pass `db` to reuse the caller's request-scoped session and avoid
    opening an extra connection. If `db` is None a short-lived session
    is created and closed immediately after the commit.
    """
    _own_session = db is None
    if _own_session:
        db = SessionLocal()

    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        db.add(entry)
        if _own_session:
            db.commit()
        # If the caller owns the session they are responsible for committing.
    except Exception as e:
        print(f"[Audit] log_action failed: {e}")
        if _own_session:
            db.rollback()
    finally:
        if _own_session:
            db.close()
