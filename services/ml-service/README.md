# ML Service

Machine learning prediction service for football matches. Uses Poisson regression and XGBoost models for match outcome predictions.

## Tech Stack

- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **ML:** scikit-learn, XGBoost, scipy (Poisson)
- **Data:** pandas, numpy
- **Database:** PostgreSQL (SQLAlchemy)
- **Cache:** Redis
- **Port:** 8000

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/` | Service info + docs link |
| POST | `/api/predictions/predict` | Single match prediction |
| POST | `/api/predictions/predict/batch` | Batch predictions |
| GET | `/api/predictions/model/info` | Model version & accuracy |

## Request/Response

### Predict Match

```json
POST /api/predictions/predict
{
  "fixture_id": 123,
  "home_team": {
    "team_id": 1,
    "name": "Team A",
    "matches_played": 20,
    "wins": 12,
    "draws": 4,
    "losses": 4,
    "goals_for": 35,
    "goals_against": 18,
    "home_wins": 8,
    "away_wins": 4,
    "last_five_form": "WWDLW",
    "league_position": 3
  },
  "away_team": { ... },
  "h2h_home_wins": 5,
  "h2h_away_wins": 3,
  "h2h_draws": 2
}
```

### Response

```json
{
  "fixture_id": 123,
  "home_win_prob": 0.45,
  "draw_prob": 0.28,
  "away_win_prob": 0.27,
  "predicted_home_score": 1.8,
  "predicted_away_score": 1.2,
  "confidence": 0.72,
  "model_version": "1.0.0-poisson",
  "key_factors": ["Home advantage", "Better form"],
  "explanation": "Home team favored due to..."
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | PostgreSQL for model metrics |
| `REDIS_URL` | No | Redis for caching |
| `PORT` | No | Server port (default: 8000) |

## Setup

```bash
cd services/ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run dev server
uvicorn app.main:app --reload --port 8000

# Or run directly
python -m app.main
```

## Architecture

```
app/
├── main.py              # FastAPI app, CORS, lifespan
├── routers/
│   ├── health.py        # Health check & root endpoint
│   └── predictions.py   # Prediction endpoints + models
├── services/
│   └── model_service.py # ML model loading & inference
└── __init__.py
```

## Models

| Model | Status | Description |
|-------|--------|-------------|
| Poisson | Active | Goal-based probability model |
| XGBoost | Planned | Feature-based classifier |
| LSTM | Planned | Time-series form model |
| Ensemble | Planned | Combined model voting |

## Status

- [x] FastAPI server with CORS
- [x] Poisson regression model
- [x] Single & batch prediction endpoints
- [x] Model info endpoint
- [x] Dockerized deployment
- [ ] XGBoost model implementation
- [ ] Feature engineering pipeline
- [ ] Model training endpoint
- [ ] Model performance tracking
