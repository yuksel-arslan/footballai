from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from pydantic import BaseModel
import httpx
import os

router = APIRouter()


# Request/Response Models
class TeamStats(BaseModel):
    team_id: int
    name: str
    matches_played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_for: int = 0
    goals_against: int = 0
    home_wins: int = 0
    away_wins: int = 0
    clean_sheets: int = 0
    points: int = 0
    last_five_form: Optional[str] = None  # "WWDLW"
    league_position: Optional[int] = None


class PredictionRequest(BaseModel):
    fixture_id: int
    home_team: TeamStats
    away_team: TeamStats
    h2h_home_wins: int = 0
    h2h_away_wins: int = 0
    h2h_draws: int = 0
    is_home_favorite: bool = False
    competition_type: str = "domestic_league"  # domestic_league, champions_league, europa_league, domestic_cup, international, friendly
    round: Optional[str] = None  # e.g. "Quarter-final", "Group Stage", "Matchday 28"


class PredictionResponse(BaseModel):
    fixture_id: int
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    predicted_home_score: float
    predicted_away_score: float
    confidence: float
    model_version: str
    key_factors: List[str]
    explanation: str


class BatchPredictionRequest(BaseModel):
    fixtures: List[PredictionRequest]


class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]
    total: int
    model_version: str


class TrainingMatch(BaseModel):
    home_stats: dict
    away_stats: dict
    h2h: dict = {}
    result: int  # 0=home_win, 1=draw, 2=away_win


class TrainingRequest(BaseModel):
    matches: List[TrainingMatch]


@router.post("/predict", response_model=PredictionResponse)
async def predict_match(request: PredictionRequest, req: Request):
    """Generate prediction for a single match."""
    model_service = req.app.state.model_service

    try:
        prediction = model_service.predict(request)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest, req: Request):
    """Generate predictions for multiple matches."""
    model_service = req.app.state.model_service

    predictions = []
    for fixture in request.fixtures:
        try:
            pred = model_service.predict(fixture)
            predictions.append(pred)
        except Exception as e:
            print(f"Failed to predict fixture {fixture.fixture_id}: {e}")
            continue

    return BatchPredictionResponse(
        predictions=predictions,
        total=len(predictions),
        model_version=model_service.model_version,
    )


@router.get("/model/info")
async def model_info(req: Request):
    """Get current model information."""
    model_service = req.app.state.model_service
    return model_service.get_models_info()


@router.get("/models")
async def list_models(req: Request):
    """List all available models and their status."""
    model_service = req.app.state.model_service
    return model_service.get_models_info()


@router.get("/performance")
async def model_performance(req: Request):
    """Get model performance metrics."""
    model_service = req.app.state.model_service
    return {
        "accuracy": model_service.get_accuracy(),
        "training_status": model_service.get_training_status(),
        "active_model": model_service.model_version,
    }


@router.post("/train")
async def train_model(request: TrainingRequest, req: Request):
    """Train XGBoost model with historical match data."""
    model_service = req.app.state.model_service

    matches = [m.model_dump() for m in request.matches]

    try:
        metrics = model_service.train_xgboost(matches)
        if "error" in metrics:
            raise HTTPException(status_code=400, detail=metrics["error"])
        return {"success": True, "metrics": metrics}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.post("/train/auto")
async def auto_train(req: Request):
    """Fetch training data from match-service and train XGBoost automatically."""
    model_service = req.app.state.model_service
    match_service_url = os.getenv("MATCH_SERVICE_URL", "http://localhost:3001")

    # 1. Fetch training data from match-service
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{match_service_url}/api/fixtures/training-data",
                params={"limit": 500},
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch training data from match-service: {str(e)}",
        )

    training_records = data.get("data", [])
    if not training_records:
        raise HTTPException(status_code=400, detail="No training data available")

    # 2. Transform to training format
    matches = []
    for record in training_records:
        matches.append({
            "home_stats": record["home_team"],
            "away_stats": record["away_team"],
            "h2h": record.get("h2h", {}),
            "result": record["result"],
        })

    # 3. Train
    try:
        metrics = model_service.train_xgboost(matches)
        if "error" in metrics:
            raise HTTPException(status_code=400, detail=metrics["error"])
        return {
            "success": True,
            "metrics": metrics,
            "training_samples": len(matches),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-training failed: {str(e)}")
