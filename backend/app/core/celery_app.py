from celery import Celery
from ..core.config import settings

celery_app = Celery(
    "federated_health_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "backend.app.services.llm_service",
        "backend.app.services.fl_service",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Standard healthcare retry policy
    task_retries=3,
    task_retry_delay=60,
)
