from fastapi import APIRouter, Request
from datetime import datetime
import time

router = APIRouter()

_start_time = time.time()

@router.get("/health")
async def health_check(request: Request):
    checks = {}
    
    # Model check
    try:
        model_service = request.app.state.model_service
        checks["model"] = "loaded" if model_service.poisson.is_ready() else "not_loaded"
    except Exception:
        checks["model"] = "unavailable"
    
    all_healthy = all(v in ("loaded", "healthy") for v in checks.values())
    
    return {
        "status": "ok" if all_healthy else "degraded",
        "service": "ml-service",
        "version": "1.0.0",
        "uptime": int(time.time() - _start_time),
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks,
    }

@router.get("/")
async def root():
    return {
        "message": "Football AI - ML Prediction Service",
        "version": "1.0.0",
        "docs": "/docs"
    }
