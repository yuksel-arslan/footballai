from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

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

@router.post("/predict", response_model=PredictionResponse)
async def predict_match(request: PredictionRequest, req: Request):
    """Generate prediction for a single match"""
    model_service = req.app.state.model_service

    try:
        prediction = model_service.predict(request)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest, req: Request):
    """Generate predictions for multiple matches"""
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
        model_version=model_service.model_version
    )

@router.get("/model/info")
async def model_info(req: Request):
    """Get current model information"""
    model_service = req.app.state.model_service
    return {
        "model_version": model_service.model_version,
        "model_type": "XGBoost + Poisson",
        "features_count": 50,
        "trained_on": "Historical match data",
        "accuracy": model_service.get_accuracy()
    }
