from fastapi import APIRouter

router = APIRouter()

@router.get("/status")
async def get_status():
    return {
        "global_accuracy": 0.84,
        "rounds_completed": 5,
        "participating_hospitals": 3,
        "privacy_budget_consumed": 0.25
    }

@router.post("/round/trigger")
async def trigger_round():
    return {"message": "FL Round triggered successfully (Task enqueued)"}
