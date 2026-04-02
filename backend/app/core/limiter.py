import os
from slowapi import Limiter
from slowapi.util import get_remote_address


def _get_key(request) -> str | None:
    """Return None in test mode to disable rate limiting, else client IP."""
    if os.getenv("TESTING", "false").lower() == "true":
        return None
    return get_remote_address(request)


limiter = Limiter(key_func=_get_key, default_limits=["200/minute"])
