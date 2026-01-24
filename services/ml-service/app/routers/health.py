from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ml-service",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/")
async def root():
    return {
        "message": "Football AI - ML Prediction Service",
        "version": "1.0.0",
        "docs": "/docs"
    }
