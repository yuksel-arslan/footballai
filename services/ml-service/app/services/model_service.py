from typing import Dict, Any
from app.models.poisson_model import PoissonPredictor
from app.models.xgboost_model import XGBoostPredictor
from app.models.ensemble_model import EnsemblePredictor
from app.services.feature_engineering import FeatureEngineer
from app.services.training_service import TrainingService


class ModelService:
    """
    Orchestrates prediction models and provides the main predict() interface.

    Manages Poisson, XGBoost, and Ensemble models.
    """

    def __init__(self):
        self.poisson = PoissonPredictor()
        self.xgboost = XGBoostPredictor()
        self.ensemble = EnsemblePredictor(self.poisson, self.xgboost)
        self.feature_engineer = FeatureEngineer()
        self.training_service = TrainingService(self.xgboost)

        self._model_loaded = False

    @property
    def model_version(self) -> str:
        if self.xgboost.is_ready():
            return self.ensemble.model_version
        return self.poisson.model_version

    def load_model(self):
        """Load all models."""
        print("  Loading Poisson model...")
        self.poisson.load()

        print("  Loading XGBoost model...")
        self.xgboost.load()

    def _calculate_expected_goals(
        self,
        attack_strength: float,
        opponent_defense: float,
        is_home: bool,
        form_score: float,
        league_position: Optional[int]
    ) -> float:
        """Calculate expected goals using Poisson regression factors"""

        # Base expected goals (league average)
        base_xg = 1.3

        # Apply attack/defense strengths
        xg = base_xg * attack_strength * opponent_defense

        # Home advantage
        if is_home:
            xg *= (1 + self.home_advantage)

        # Form adjustment (-20% to +20%)
        form_adjustment = (form_score - 0.5) * 0.4
        xg *= (1 + form_adjustment)

        # League position adjustment (if available)
        if league_position:
            # Top 4 teams get boost, bottom 4 get penalty
            if league_position <= 4:
                xg *= 1.1
            elif league_position >= 17:
                xg *= 0.9

        return max(0.3, min(4.0, xg))  # Clamp between 0.3 and 4.0

    def _poisson_probabilities(self, home_xg: float, away_xg: float) -> Dict[str, float]:
        """Calculate match outcome probabilities using Poisson distribution"""

        max_goals = 7
        goals = np.arange(max_goals)
        home_probs = poisson.pmf(goals, home_xg)
        away_probs = poisson.pmf(goals, away_xg)

        prob_matrix = np.outer(home_probs, away_probs)

        home_win = float(np.tril(prob_matrix, -1).sum())
        draw = float(np.trace(prob_matrix))
        away_win = float(np.triu(prob_matrix, 1).sum())

        total = home_win + draw + away_win
        self._model_loaded = True
        active = "Ensemble (Poisson + XGBoost)" if self.xgboost.is_ready() else "Poisson only"
        print(f"  Active model: {active}")

    def get_accuracy(self) -> Dict[str, float]:
        return self.poisson.get_model_info()["accuracy"]

    def get_models_info(self) -> Dict[str, Any]:
        return {
            "active_model": self.model_version,
            "ensemble": self.ensemble.get_model_info(),
            "poisson": self.poisson.get_model_info(),
            "xgboost": self.xgboost.get_model_info(),
        }

    def predict(self, request) -> Dict[str, Any]:
        """
        Main prediction method. Uses ensemble when XGBoost is ready,
        otherwise falls back to Poisson only.

        Accepts a PredictionRequest pydantic model.
        """
        home = request.home_team.model_dump()
        away = request.away_team.model_dump()

        # Extract features for ensemble/xgboost
        h2h = {
            'home_wins': request.h2h_home_wins,
            'away_wins': request.h2h_away_wins,
            'draws': request.h2h_draws,
            'total_games': request.h2h_home_wins + request.h2h_away_wins + request.h2h_draws,
        }

        features = self.feature_engineer.extract_features(home, away, h2h)
        features['home_stats'] = home
        features['away_stats'] = away
        features['h2h_home_wins'] = request.h2h_home_wins
        features['h2h_away_wins'] = request.h2h_away_wins
        features['h2h_draws'] = request.h2h_draws

        # Get ensemble prediction
        result = self.ensemble.predict(features)

        if result is None:
            # Fallback to legacy Poisson
            return self.poisson.predict_from_request(request)

        # Format response
        max_prob = max(result["home_win_prob"], result["draw_prob"], result["away_win_prob"])
        confidence = min(100, max_prob * 100 + 20)

        factors = self.poisson._generate_key_factors(home, away, {
            "home_win_prob": result["home_win_prob"],
            "draw_prob": result["draw_prob"],
            "away_win_prob": result["away_win_prob"],
            "predicted_home_score": result.get("predicted_home_score", 0),
            "predicted_away_score": result.get("predicted_away_score", 0),
        })

        explanation = self.poisson._generate_explanation(
            {
                "home_win_prob": result["home_win_prob"],
                "draw_prob": result["draw_prob"],
                "away_win_prob": result["away_win_prob"],
                "predicted_home_score": result.get("predicted_home_score", 0),
                "predicted_away_score": result.get("predicted_away_score", 0),
            },
            home.get('name', 'Home'),
            away.get('name', 'Away'),
        )

        return {
            "fixture_id": request.fixture_id,
            "home_win_prob": round(result["home_win_prob"] * 100, 1),
            "draw_prob": round(result["draw_prob"] * 100, 1),
            "away_win_prob": round(result["away_win_prob"] * 100, 1),
            "predicted_home_score": result.get("predicted_home_score", 0),
            "predicted_away_score": result.get("predicted_away_score", 0),
            "confidence": round(confidence, 1),
            "model_version": self.model_version,
            "key_factors": factors,
            "explanation": explanation,
        }

    def train_xgboost(self, matches: list) -> Dict[str, Any]:
        """Train XGBoost model with historical match data."""
        return self.training_service.train(matches)

    def get_training_status(self) -> Dict[str, Any]:
        return {
            "in_progress": self.training_service.is_training(),
            "last_metrics": self.training_service.get_last_metrics(),
        }
