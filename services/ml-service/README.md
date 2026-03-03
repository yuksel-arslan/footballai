# ML Service

Machine learning prediction service for football matches. Uses an ensemble of Poisson regression and XGBoost models for match outcome predictions, with feature engineering and a training pipeline.

## Tech Stack

- **Runtime:** Python 3.11
- **Framework:** FastAPI 0.109
- **Server:** Uvicorn (ASGI)
- **ML:** scikit-learn 1.4, XGBoost 2.0, scipy 1.12
- **Data:** pandas 2.1, numpy 1.26
- **Model persistence:** joblib 1.3
- **Database:** PostgreSQL (SQLAlchemy 2.0, psycopg2)
- **Cache:** Redis 5
- **HTTP Client:** httpx 0.26
- **Port:** 8000

## API Endpoints

### Predictions

| Method | Path                             | Description                |
| ------ | -------------------------------- | -------------------------- |
| POST   | `/api/predictions/predict`       | Single match prediction    |
| POST   | `/api/predictions/predict/batch` | Batch predictions          |
| POST   | `/api/predictions/train`         | Train XGBoost model        |
| GET    | `/api/predictions/model/info`    | Model version & accuracy   |
| GET    | `/api/predictions/models`        | List all models and status |
| GET    | `/api/predictions/performance`   | Model performance metrics  |

```json
// POST /api/predictions/predict
// Request:
{
  "fixture_id": 1,
  "home_team": {
    "team_id": 57, "name": "Arsenal",
    "matches_played": 28, "wins": 20, "draws": 5, "losses": 3,
    "goals_for": 60, "goals_against": 22,
    "home_wins": 12, "away_wins": 8, "clean_sheets": 14,
    "points": 65, "last_five_form": "WWDWL", "league_position": 1
  },
  "away_team": { ... },
  "h2h_home_wins": 8, "h2h_away_wins": 6, "h2h_draws": 4
}

// Response:
{
  "fixture_id": 1,
  "home_win_prob": 0.55,
  "draw_prob": 0.25,
  "away_win_prob": 0.20,
  "predicted_home_score": 2.1,
  "predicted_away_score": 0.8,
  "confidence": 0.72,
  "model_version": "ensemble_v1",
  "key_factors": ["Strong home form", "Superior goal difference"],
  "explanation": "Arsenal favored based on home advantage and recent form"
}
```

```json
// POST /api/predictions/train
// Request:
{
  "matches": [
    {
      "home_stats": { "goals_for": 50, "goals_against": 20, ... },
      "away_stats": { "goals_for": 35, "goals_against": 30, ... },
      "h2h": { "home_wins": 5, "away_wins": 3, "draws": 2 },
      "result": 0
    }
  ]
}
// result: 0=home_win, 1=draw, 2=away_win

// Response:
{ "success": true, "metrics": { "accuracy": 0.68, "f1_score": 0.65 } }
```

### Health & Info

| Method | Path      | Description                 |
| ------ | --------- | --------------------------- |
| GET    | `/health` | Health check (model status) |
| GET    | `/`       | Service info + docs link    |

```json
// GET /health
{
  "status": "ok",
  "service": "ml-service",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2026-03-03T12:00:00Z",
  "checks": { "model": "loaded" }
}
```

## Environment Variables

| Variable        | Required | Default        | Description                              |
| --------------- | -------- | -------------- | ---------------------------------------- |
| `PORT`          | No       | 8000           | Server port                              |
| `HOST`          | No       | 0.0.0.0        | Server host                              |
| `DEBUG`         | No       | false          | Debug mode                               |
| `DATABASE_URL`  | No       | -              | PostgreSQL (for training data)           |
| `REDIS_URL`     | No       | -              | Redis (for prediction caching)           |
| `MODEL_DIR`     | No       | trained_models | Model storage directory                  |
| `DEFAULT_MODEL` | No       | ensemble       | Active model: poisson, xgboost, ensemble |

## Project Structure

```
services/ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI app, CORS, lifespan
│   ├── config.py                    # Settings
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base_model.py            # Abstract base class
│   │   ├── poisson_model.py         # Poisson distribution model
│   │   ├── xgboost_model.py         # XGBoost classifier
│   │   └── ensemble_model.py        # Weighted ensemble (40% Poisson + 60% XGBoost)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py                # Health check routes
│   │   └── predictions.py           # Prediction & training routes
│   └── services/
│       ├── __init__.py
│       ├── feature_engineering.py    # 21-feature extraction pipeline
│       ├── model_service.py          # Model orchestrator
│       └── training_service.py       # XGBoost training pipeline
├── data/                             # Training data
├── trained_models/                   # Saved model files (.joblib)
├── tests/
│   ├── __init__.py
│   ├── test_model.py                # Model unit tests
│   └── test_predictions.py          # Prediction endpoint tests
├── Dockerfile
├── requirements.txt
└── railway.json
```

## ML Models

| Model    | Weight | Status                 | Description                                       |
| -------- | ------ | ---------------------- | ------------------------------------------------- |
| Poisson  | 40%    | Active                 | Goal-based probability using Poisson distribution |
| XGBoost  | 60%    | Ready (needs training) | Feature-based 3-class classifier (H/D/A)          |
| Ensemble | -      | Active                 | Weighted blend of both models                     |

When XGBoost is not trained, the ensemble falls back to Poisson-only predictions.

## Feature Engineering (21 Features)

- Home/Away form scores (last 5 matches)
- Attack strength & defense strength
- Goals per game, conceded per game
- Clean sheet rates
- League position, points, position difference
- H2H win/draw rates
- Overall, home, and away win rates
- Home advantage factor

## Local Development

```bash
# Navigate to service
cd services/ml-service

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start dev server with hot reload
python -m app.main
# or
uvicorn app.main:app --reload --port 8000

# Run tests
pytest

# API docs available at http://localhost:8000/docs
```

## Deployment

- **Platform:** Railway (Docker)
- **Build:** `Dockerfile` in service root
- **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health check:** `GET /health`

## Dependencies (Other Services)

| Service           | Relationship        | Description                                 |
| ----------------- | ------------------- | ------------------------------------------- |
| **match-service** | Downstream consumer | Receives prediction requests via HTTP proxy |
| **api-gateway**   | Upstream proxy      | Receives proxied requests from gateway      |
| **PostgreSQL**    | Database            | Training data source (optional)             |
| **Redis**         | Cache               | Prediction result caching (optional)        |
