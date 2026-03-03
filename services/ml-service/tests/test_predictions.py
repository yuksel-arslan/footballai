import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    """Test that health endpoint returns 200."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_predict_endpoint(client):
    """Test single match prediction endpoint."""
    response = client.post("/api/predictions/predict", json={
        "fixture_id": 1,
        "home_team": {
            "team_id": 1,
            "name": "Team A",
            "matches_played": 10,
            "wins": 6,
            "draws": 2,
            "losses": 2,
            "goals_for": 18,
            "goals_against": 8,
            "home_wins": 4,
            "away_wins": 2,
            "clean_sheets": 4,
            "points": 20,
            "last_five_form": "WWDLW",
            "league_position": 3,
        },
        "away_team": {
            "team_id": 2,
            "name": "Team B",
            "matches_played": 10,
            "wins": 4,
            "draws": 3,
            "losses": 3,
            "goals_for": 12,
            "goals_against": 10,
            "home_wins": 3,
            "away_wins": 1,
            "clean_sheets": 2,
            "points": 15,
            "last_five_form": "WLDWL",
            "league_position": 8,
        },
        "h2h_home_wins": 3,
        "h2h_away_wins": 2,
        "h2h_draws": 1,
    })
    assert response.status_code == 200
    data = response.json()

    # Check required fields
    assert "home_win_prob" in data
    assert "draw_prob" in data
    assert "away_win_prob" in data
    assert "predicted_home_score" in data
    assert "predicted_away_score" in data
    assert "confidence" in data
    assert "model_version" in data

    # Check probability ranges
    assert 0 <= data["home_win_prob"] <= 100
    assert 0 <= data["draw_prob"] <= 100
    assert 0 <= data["away_win_prob"] <= 100

    # Check probabilities sum to ~100
    prob_sum = data["home_win_prob"] + data["draw_prob"] + data["away_win_prob"]
    assert abs(prob_sum - 100) < 1

    # Check scores are non-negative
    assert data["predicted_home_score"] >= 0
    assert data["predicted_away_score"] >= 0

    # Check confidence range
    assert 0 <= data["confidence"] <= 100


def test_predict_minimal_stats(client):
    """Test prediction with minimal team stats."""
    response = client.post("/api/predictions/predict", json={
        "fixture_id": 2,
        "home_team": {"team_id": 1, "name": "Team A"},
        "away_team": {"team_id": 2, "name": "Team B"},
    })
    assert response.status_code == 200
    data = response.json()
    assert "home_win_prob" in data


def test_batch_predict(client):
    """Test batch prediction endpoint."""
    response = client.post("/api/predictions/predict/batch", json={
        "fixtures": [
            {
                "fixture_id": 1,
                "home_team": {"team_id": 1, "name": "Team A", "matches_played": 10, "goals_for": 15, "goals_against": 8},
                "away_team": {"team_id": 2, "name": "Team B", "matches_played": 10, "goals_for": 10, "goals_against": 12},
            },
            {
                "fixture_id": 2,
                "home_team": {"team_id": 3, "name": "Team C", "matches_played": 10, "goals_for": 20, "goals_against": 5},
                "away_team": {"team_id": 4, "name": "Team D", "matches_played": 10, "goals_for": 8, "goals_against": 15},
            },
        ]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["predictions"]) == 2


def test_model_info(client):
    """Test model info endpoint."""
    response = client.get("/api/predictions/model/info")
    assert response.status_code == 200
    data = response.json()
    assert "active_model" in data
    assert "poisson" in data
    assert "xgboost" in data


def test_model_performance(client):
    """Test model performance endpoint."""
    response = client.get("/api/predictions/performance")
    assert response.status_code == 200
    data = response.json()
    assert "accuracy" in data
    assert "active_model" in data


def test_models_list(client):
    """Test models list endpoint."""
    response = client.get("/api/predictions/models")
    assert response.status_code == 200
    data = response.json()
    assert "ensemble" in data
