from sqlalchemy.orm import Session
from ..core.database import SessionLocal
from ..models.models import AuditLog
import json

def log_action(user_id: str, action: str, resource_type: str, resource_id: str = None, details: dict = None, ip_address: str = None):
    """Logs an action to the database."""
    db = SessionLocal()
    try:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Audit log failed: {e}")
        db.rollback()
    finally:
        db.close()

def get_logs(limit: int = 100):
    """Retrieves recent audit logs from the database."""
    db = SessionLocal()
    try:
        return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    finally:
        db.close()
