from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.routers import predictions, health
from app.services.model_service import ModelService

# Initialize model service
model_service = ModelService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load model
    print("🚀 Loading prediction model...")
    model_service.load_model()
    print("✅ Model loaded successfully!")
    yield
    # Shutdown
    print("👋 Shutting down ML Service...")

app = FastAPI(
    title="Football AI - ML Service",
    description="Machine Learning prediction service using Poisson regression and XGBoost ensemble models for football match outcome prediction. Provides single and batch predictions, model training, and performance metrics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
allowed_origins = [
    "https://footballai.io",
    "https://www.footballai.io",
]
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))
if os.getenv("NODE_ENV", "development") == "development":
    allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)

# Routers
app.include_router(health.router, tags=["Health"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])

# Make model service available
app.state.model_service = model_service

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
