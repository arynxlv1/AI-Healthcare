from .core.celery_app import celery_app
from .core.database import SessionLocal
from .models.models import FLRound
import time
import json
import random
from .core.config import settings


def _try_publish(channel: str, payload: dict) -> bool:
    """Publish to Redis if available, silently skip if not."""
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.publish(channel, json.dumps(payload))
        r.close()
        return True
    except Exception:
        return False


@celery_app.task(name="trigger_fl_round_task")
def trigger_fl_round_task():
    """
    Simulates a federated learning round.
    Works with or without Redis — publishes progress events when Redis is available,
    falls back to DB-only mode when it's not.
    """
    db = SessionLocal()
    try:
        latest = db.query(FLRound).order_by(FLRound.created_at.desc()).first()
        prev_acc = latest.global_accuracy if latest else 0.65
        prev_epsilon = latest.epsilon_used if latest else 0.0

        new_acc = min(0.98, prev_acc + random.uniform(0.01, 0.03))
        new_epsilon = prev_epsilon + 0.05
        hospitals = ["HOSP_001", "HOSP_002", "HOSP_003"]

        # Publish step progress (best-effort — no crash if Redis is down)
        for step in range(1, 5):
            _try_publish("fl_updates_global", {
                "type": "round_status",
                "step": step,
                "total_steps": 4,
                "message": f"Global aggregation step {step}/4 in progress...",
            })
            time.sleep(1)

        # Persist round to DB
        new_round = FLRound(
            global_accuracy=new_acc,
            participating_hospitals_count=len(hospitals),
            epsilon_used=new_epsilon,
        )
        db.add(new_round)
        db.commit()
        db.refresh(new_round)

        # Publish final fl_progress event (matches frontend WS handler)
        final_event = {
            "type": "fl_progress",
            "round": new_round.id,
            "accuracy": new_acc,
            "loss": round(max(0.0, 1.0 - new_acc - 0.05), 4),
            "clients": len(hospitals),
            "epsilon": new_epsilon,
        }
        _try_publish("fl_updates_global", final_event)
        for h_id in hospitals:
            _try_publish(f"fl_updates_{h_id}", final_event)

        return f"FL Round {new_round.id} completed. Accuracy: {new_acc:.4f}"

    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()
