from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, field_validator
from datetime import date
from dataclasses import asdict
import httpx
import os

from app.models.dixon_coles import DixonColesModel, Match, TeamRatings
from app.services.value_engine import analyse
from app.services import ratings_cache

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


# ============================================================================
# Dixon-Coles + value-bet endpoint
#
# Unlike /predict (season-stats heuristic Poisson), this fits a Dixon-Coles
# model by MLE on supplied match history (with exponential time-decay) and,
# when 1X2 odds are given, returns vig-free market probabilities, per-selection
# edge/EV and quarter-Kelly stakes. This is the engine behind the premium
# "value bet" tier.
# ============================================================================
class DCMatchIn(BaseModel):
    home: str
    away: str
    home_goals: int = Field(ge=0)
    away_goals: int = Field(ge=0)
    match_date: date


class LiveStateIn(BaseModel):
    """In-play state: condition the prediction on score + elapsed time."""

    minute: int = Field(ge=0, le=130)
    home_goals: int = Field(ge=0, le=30)
    away_goals: int = Field(ge=0, le=30)


class DixonColesRequest(BaseModel):
    home: str
    away: str
    neutral: bool = False
    live: Optional[LiveStateIn] = Field(
        default=None,
        description="in-play state; when set, probabilities are for the FINAL "
        "result conditioned on the current score and minute",
    )
    xi: float = Field(default=0.0018, ge=0.0, le=0.02,
                      description="time-decay rate (1/days); 0 = no decay")
    history: List[DCMatchIn] = Field(min_length=1)
    odds: Optional[Dict[str, float]] = Field(
        default=None,
        description="optional 1X2 odds keyed home/draw/away for value analysis",
    )
    kelly_fraction: float = Field(default=0.25, gt=0, le=1)
    min_edge: float = Field(default=0.03, ge=0.0, le=1.0)
    ratings_key: Optional[str] = Field(
        default=None,
        description="namespace (e.g. league id) for caching fitted ratings; "
        "omit to disable caching and always fit fresh",
    )

    @field_validator("odds")
    @classmethod
    def _check_odds(cls, v):
        if v is None:
            return v
        if not {"home", "draw", "away"} <= set(v):
            raise ValueError("odds must contain keys: home, draw, away")
        if any(o <= 1.0 for o in v.values()):
            raise ValueError("decimal odds must be > 1.0")
        return v


@router.post("/dixon-coles")
async def predict_dixon_coles(request: DixonColesRequest):
    """Fit Dixon-Coles on match history (or reuse cached ratings) and return
    calibrated probabilities plus (optionally) value-bet signals."""
    model = DixonColesModel(xi=request.xi)

    # Cache key: league namespace + content fingerprint (match count + latest
    # date). Backfill that adds matches changes the fingerprint, so stale
    # ratings are bypassed automatically.
    cache_key = None
    cached = False
    if request.ratings_key:
        latest = max(m.match_date for m in request.history)
        cache_key = (
            f"dc:ratings:{request.ratings_key}:"
            f"{len(request.history)}:{latest.isoformat()}"
        )
        payload = ratings_cache.get(cache_key)
        if payload:
            try:
                model.ratings = TeamRatings(
                    attack=payload["attack"],
                    defence=payload["defence"],
                    home_adv=payload["home_adv"],
                    rho=payload["rho"],
                    teams=payload["teams"],
                )
                cached = True
            except Exception:
                cached = False

    try:
        if not cached:
            matches = [
                Match(m.home, m.away, m.home_goals, m.away_goals, m.match_date)
                for m in request.history
            ]
            ratings = model.fit(matches)
            if cache_key:
                ratings_cache.set(
                    cache_key,
                    {
                        "attack": ratings.attack,
                        "defence": ratings.defence,
                        "home_adv": ratings.home_adv,
                        "rho": ratings.rho,
                        "teams": ratings.teams,
                    },
                )
        pred = model.predict(
            request.home,
            request.away,
            neutral=request.neutral,
            live=request.live.model_dump() if request.live else None,
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=f"team not found in history: {e}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dixon-Coles prediction failed: {str(e)}")

    ratings_obj = model.ratings  # set from cache or fresh fit
    value = None
    if request.odds:
        probs = {
            "home": pred["home_win"],
            "draw": pred["draw"],
            "away": pred["away_win"],
        }
        value = [
            asdict(vr)
            for vr in analyse(
                probs,
                request.odds,
                kelly_frac=request.kelly_fraction,
                min_edge=request.min_edge,
            )
        ]

    return {
        "fixture": f"{request.home} vs {request.away}",
        "probabilities": pred,
        "ratings_used": len(ratings_obj.teams),
        "home_advantage": ratings_obj.home_adv,
        "rho": ratings_obj.rho,
        "cached": cached,
        "value": value,
        "live": request.live.model_dump() if request.live else None,
    }
