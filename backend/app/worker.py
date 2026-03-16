from .core.celery_app import celery_app
from .services.pii_stripper import PIIStripper
import os

# Initialize components that might be needed globally in worker
stripper = PIIStripper()

@celery_app.task(name="test_task")
def test_task(name: str):
    return f"Hello {name}, Celery is working!"

@celery_app.task(name="process_pii_task")
def process_pii_task(text: str):
    return stripper.strip(text)

@celery_app.task(name="trigger_fl_round_task")
def trigger_fl_round_task():
    # This will interact with the Flower server in Phase 4
    return "FL Round Triggered"
