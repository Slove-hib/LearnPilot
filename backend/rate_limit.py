import time
from collections import defaultdict
from fastapi import HTTPException, Request

# In-memory rate limit store: {key: [timestamps]}
_store: dict[str, list[float]] = defaultdict(list)

# Configurable limits
DEFAULT_LIMIT = 60  # requests per window
DEFAULT_WINDOW = 60  # seconds
AI_LIMIT = 20       # AI endpoint limit per window
AI_WINDOW = 60      # seconds


def _cleanup(key: str, window: float):
    """Remove expired entries."""
    now = time.time()
    _store[key] = [t for t in _store[key] if now - t < window]


def check_rate_limit(key: str, limit: int, window: float):
    """Check if the request exceeds the rate limit. Raises 429 if exceeded."""
    _cleanup(key, window)
    if len(_store[key]) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"请求过于频繁，请 {int(window)} 秒后再试。",
        )
    _store[key].append(time.time())


def rate_limit_dependency(limit: int = DEFAULT_LIMIT, window: float = DEFAULT_WINDOW):
    """FastAPI dependency factory for rate limiting by IP."""
    async def _check(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        key = f"{client_ip}:{limit}:{window}"
        check_rate_limit(key, limit, window)
    return _check


def ai_rate_limit_dependency():
    """Rate limit for AI-intensive endpoints."""
    return rate_limit_dependency(limit=AI_LIMIT, window=AI_WINDOW)
