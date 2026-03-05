import pytest
from app.models.poisson_model import PoissonPredictor
from app.models.xgboost_model import XGBoostPredictor
from app.models.ensemble_model import EnsemblePredictor
from app.services.feature_engineering import FeatureEngineer


class TestPoissonModel:
    """Test Poisson distribution prediction model."""

    def setup_method(self):
        self.model = PoissonPredictor()
        self.model.load()

    def test_model_is_ready(self):
        assert self.model.is_ready() is True

    def test_model_info(self):
        info = self.model.get_model_info()
        assert info["model_type"] == "Poisson Distribution"
        assert "accuracy" in info

    def test_predict_basic(self):
        features = {
            "home_stats": {
                "matches_played": 10,
                "goals_for": 18,
                "goals_against": 8,
                "last_five_form": "WWDLW",
                "league_position": 3,
            },
            "away_stats": {
                "matches_played": 10,
                "goals_for": 12,
                "goals_against": 10,
                "last_five_form": "WLDWL",
                "league_position": 8,
            },
            "h2h_home_wins": 3,
            "h2h_away_wins": 2,
            "h2h_draws": 1,
        }

        result = self.model.predict(features)
        assert result is not None
        assert 0 <= result["home_win_prob"] <= 1
        assert 0 <= result["draw_prob"] <= 1
        assert 0 <= result["away_win_prob"] <= 1
        assert abs(result["home_win_prob"] + result["draw_prob"] + result["away_win_prob"] - 1) < 0.01

    def test_predict_empty_stats(self):
        features = {
            "home_stats": {"matches_played": 0, "goals_for": 0, "goals_against": 0},
            "away_stats": {"matches_played": 0, "goals_for": 0, "goals_against": 0},
        }
        result = self.model.predict(features)
        assert result is not None

    def test_home_advantage(self):
        """Home team should have slight advantage with equal stats."""
        features = {
            "home_stats": {"matches_played": 10, "goals_for": 13, "goals_against": 13},
            "away_stats": {"matches_played": 10, "goals_for": 13, "goals_against": 13},
        }
        result = self.model.predict(features)
        assert result is not None
        assert result["home_win_prob"] > result["away_win_prob"]

    def test_form_score_calculation(self):
        assert self.model._calculate_form_score("WWWWW") > self.model._calculate_form_score("LLLLL")
        assert self.model._calculate_form_score("DDDDD") == pytest.approx(0.5, abs=0.01)
        assert self.model._calculate_form_score(None) == 0.5


class TestXGBoostModel:
    """Test XGBoost prediction model."""

    def setup_method(self):
        self.model = XGBoostPredictor()

    def test_model_not_ready_without_training(self):
        assert self.model.is_ready() is False

    def test_predict_returns_none_when_not_ready(self):
        features = {"home_form_score": 0.5}
        result = self.model.predict(features)
        assert result is None

    def test_model_info(self):
        info = self.model.get_model_info()
        assert info["model_type"] == "XGBoost Classifier"
        assert info["trained"] is False
        assert info["features_count"] == 22


class TestEnsembleModel:
    """Test Ensemble prediction model."""

    def setup_method(self):
        self.poisson = PoissonPredictor()
        self.poisson.load()
        self.xgboost = XGBoostPredictor()
        self.ensemble = EnsemblePredictor(self.poisson, self.xgboost)

    def test_fallback_to_poisson_when_xgboost_not_ready(self):
        features = {
            "home_stats": {"matches_played": 10, "goals_for": 15, "goals_against": 8},
            "away_stats": {"matches_played": 10, "goals_for": 10, "goals_against": 12},
        }
        result = self.ensemble.predict(features)
        assert result is not None
        # Should return Poisson-only result since XGBoost is not trained
        assert result["predicted_home_score"] > 0

    def test_ensemble_info(self):
        info = self.ensemble.get_model_info()
        assert info["model_type"] == "Ensemble (Poisson + XGBoost)"
        assert info["xgboost_active"] is False
        assert len(info["sub_models"]) == 2


class TestFeatureEngineering:
    """Test feature extraction."""

    def setup_method(self):
        self.fe = FeatureEngineer()

    def test_extract_features(self):
        home = {"matches_played": 10, "goals_for": 15, "goals_against": 8, "wins": 6, "clean_sheets": 4, "points": 20, "home_wins": 4, "league_position": 3, "last_five_form": "WWDLW"}
        away = {"matches_played": 10, "goals_for": 10, "goals_against": 12, "wins": 4, "clean_sheets": 2, "points": 12, "away_wins": 2, "league_position": 8, "last_five_form": "WLDWL"}
        h2h = {"home_wins": 3, "draws": 1, "total_games": 6}

        features = self.fe.extract_features(home, away, h2h)

        assert "home_form_score" in features
        assert "away_form_score" in features
        assert "home_attack_strength" in features
        assert "league_position_diff" in features
        assert features["home_goals_per_game"] == pytest.approx(1.5)
        assert features["league_position_diff"] == 5  # 8 - 3

    def test_extract_features_empty_stats(self):
        features = self.fe.extract_features({}, {}, {})
        assert features["home_form_score"] == 0.5
        assert features["home_goals_per_game"] == 0.0

    def test_form_score(self):
        assert FeatureEngineer._form_score("WWWWW") > 0.8
        assert FeatureEngineer._form_score("LLLLL") == 0.0
        assert FeatureEngineer._form_score(None) == 0.5
