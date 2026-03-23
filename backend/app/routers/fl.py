from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.models import FLRound

router = APIRouter()


@router.get("/status")
async def get_status(db: Session = Depends(get_db)):
    rounds = db.query(FLRound).order_by(FLRound.created_at.asc()).all()
    latest = rounds[-1] if rounds else None

    history = [
        {
            "round": r.id,
            "accuracy": r.global_accuracy,
            "loss": round(max(0.0, 1.0 - r.global_accuracy - 0.05), 4),
            "clients": r.participating_hospitals_count,
        }
        for r in rounds
    ]

    return {
        "accuracy": latest.global_accuracy if latest else 0.0,
        "current_round": latest.id if latest else 0,
        "total_rounds": 5,
        "clients": latest.participating_hospitals_count if latest else 0,
        "privacy_budget": f"ε={latest.epsilon_used:.2f}" if latest else "ε=0.00",
        "history": history,
    }


@router.post("/trigger")
async def trigger_round(request: Request, db: Session = Depends(get_db)):
    # RBAC middleware already enforces hospital_admin / super_admin access to /api/fl
    # Try Celery first; fall back to running synchronously if broker unavailable
    try:
        from ..worker import trigger_fl_round_task
        task = trigger_fl_round_task.delay()
        return {"message": "FL round triggered (async)", "task_id": task.id}
    except Exception:
        pass

    # Sync fallback — runs in-process, no Celery/Redis required
    try:
        from ..worker import trigger_fl_round_task
        result = trigger_fl_round_task.run()
        return {"message": "FL round completed", "result": result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"FL trigger failed: {str(e)}")
