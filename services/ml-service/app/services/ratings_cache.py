"""Optional Redis cache for fitted Dixon-Coles ratings.

Fitting (MLE) is the expensive step; building the score matrix from ratings is
cheap. Caching the fitted ``TeamRatings`` — keyed by a league namespace plus a
content fingerprint of the history (match count + latest date) — lets every
fixture in the same league/season reuse a single fit. When a backfill adds new
finished matches the fingerprint changes, so stale ratings are bypassed
automatically (a TTL is kept only as a safety net).

Fully optional: if ``REDIS_URL`` is unset or the server is unreachable, every
call simply fits fresh. All Redis errors are swallowed so caching never breaks
prediction.
"""
from __future__ import annotations

import json
from typing import Optional

from app.config import settings

_client = None
_init_done = False

# 12h safety net; the history fingerprint is the real freshness mechanism.
TTL_SECONDS = 60 * 60 * 12


def _get_client():
    global _client, _init_done
    if _init_done:
        return _client
    _init_done = True

    url = settings.REDIS_URL
    if not url:
        _client = None
        return None
    try:
        import redis  # redis-py 5.x; handles redis:// and rediss:// (Upstash TLS)

        client = redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()
        _client = client
    except Exception:
        _client = None
    return _client


def get(key: str) -> Optional[dict]:
    client = _get_client()
    if client is None:
        return None
    try:
        raw = client.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def set(key: str, payload: dict, ttl: int = TTL_SECONDS) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.set(key, json.dumps(payload), ex=ttl)
    except Exception:
        pass
