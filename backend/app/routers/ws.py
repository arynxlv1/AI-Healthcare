from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import asyncio
import json
from ..core.config import settings
from ..services.auth_service import AuthService

router = APIRouter()

HEARTBEAT_INTERVAL = 30


@router.websocket("/fl")
async def websocket_fl_updates(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()

    # Validate token
    payload = AuthService.decode_token(token)
    if not payload:
        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid token"}))
        await websocket.close(code=4001)
        return

    hospital_id = payload.get("hospital_id") or "global"

    # Try to connect to Redis pub/sub — gracefully degrade if unavailable
    pubsub = None
    redis_client = None
    try:
        import redis.asyncio as aioredis
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        await redis_client.ping()
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(f"fl_updates_{hospital_id}", "fl_updates_global")
        await websocket.send_text(json.dumps({"type": "info", "message": "Connected — live FL updates enabled"}))
    except Exception:
        await websocket.send_text(json.dumps({
            "type": "info",
            "message": "Connected — Redis unavailable, live updates disabled. Trigger FL to see results via page refresh.",
        }))

    last_heartbeat = asyncio.get_event_loop().time()

    try:
        while True:
            # Poll Redis if connected
            if pubsub:
                try:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
                    if message and message.get("data"):
                        await websocket.send_text(message["data"])
                except Exception:
                    pubsub = None  # Redis dropped — keep WS alive, stop polling

            # Heartbeat
            now = asyncio.get_event_loop().time()
            if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                await websocket.send_text(json.dumps({"type": "heartbeat"}))
                last_heartbeat = now

            await asyncio.sleep(0.05)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error for hospital {hospital_id}: {e}")
    finally:
        if pubsub:
            try:
                await pubsub.unsubscribe()
            except Exception:
                pass
        if redis_client:
            try:
                await redis_client.aclose()
            except Exception:
                pass
