# ML Service

Machine learning prediction service for football matches. Uses an ensemble of Poisson regression and XGBoost models for match outcome predictions, with feature engineering and a training pipeline.

## Tech Stack

- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **ML:** scikit-learn, XGBoost, scipy (Poisson), joblib
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
| GET | `/api/predictions/models` | List all models and status |
| GET | `/api/predictions/performance` | Model performance metrics |
| POST | `/api/predictions/train` | Train XGBoost model with data |

## Architecture

```
app/
├── main.py                    # FastAPI app, CORS, lifespan
├── config.py                  # Settings
├── models/                    # ML models
│   ├── base_model.py          # Abstract base class
│   ├── poisson_model.py       # Poisson distribution model
│   ├── xgboost_model.py       # XGBoost classifier
│   └── ensemble_model.py      # Weighted ensemble
├── routers/
│   ├── health.py              # Health check
│   └── predictions.py         # Prediction + training endpoints
├── services/
│   ├── model_service.py       # Model orchestrator
│   ├── feature_engineering.py # 21-feature extraction
│   └── training_service.py    # XGBoost training pipeline
data/                          # Training data
trained_models/                # Saved model files
```

## Models

| Model | Status | Description |
|-------|--------|-------------|
| Poisson | Active | Goal-based probability using Poisson distribution |
| XGBoost | Ready (needs training) | Feature-based 3-class classifier (H/D/A) |
| Ensemble | Active | Weighted blend: 40% Poisson + 60% XGBoost |

When XGBoost is not trained, the ensemble falls back to Poisson-only predictions.

## Feature Engineering (21 features)

- Form scores (home/away)
- Attack/defense strength
- Goals per game, conceded per game
- Clean sheet rates
- League position difference, points
- H2H win/draw rates
- Overall and home/away win rates

## Status

- [x] FastAPI server with CORS
- [x] Poisson regression model
- [x] XGBoost model implementation
- [x] Ensemble model (Poisson + XGBoost)
- [x] Feature engineering pipeline (21 features)
- [x] Model training endpoint
- [x] Model performance tracking
- [x] Single & batch prediction endpoints
- [x] Dockerized deployment
- [ ] LSTM time-series model
- [ ] Auto-training from database
