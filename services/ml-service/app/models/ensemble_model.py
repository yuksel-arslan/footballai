from typing import Dict, Any, Optional
from .base_model import BasePredictor
from .poisson_model import PoissonPredictor
from .xgboost_model import XGBoostPredictor


class EnsemblePredictor(BasePredictor):
    """
    Ensemble model combining Poisson + XGBoost predictions.

    When XGBoost is trained, uses weighted average of both models.
    When XGBoost is not available, falls back to Poisson only.
    """

    def __init__(self, poisson: PoissonPredictor, xgboost: XGBoostPredictor):
        self.poisson = poisson
        self.xgboost = xgboost
        self.model_version = "v1.0.0-ensemble"
        self.poisson_weight = 0.4
        self.xgboost_weight = 0.6

    def is_ready(self) -> bool:
        return self.poisson.is_ready()

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_type": "Ensemble (Poisson + XGBoost)",
            "version": self.model_version,
            "poisson_weight": self.poisson_weight,
            "xgboost_weight": self.xgboost_weight,
            "xgboost_active": self.xgboost.is_ready(),
            "sub_models": [
                self.poisson.get_model_info(),
                self.xgboost.get_model_info(),
            ],
        }

    def predict(self, features: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """
        Generate ensemble prediction.

        If XGBoost is ready, blend both models' probabilities.
        Otherwise, use Poisson only.
        """
        poisson_result = self.poisson.predict(features)
        if poisson_result is None:
            return None

        xgboost_result = self.xgboost.predict(features)

        if xgboost_result is None:
            # XGBoost not available, return Poisson only
            return poisson_result

        # Weighted ensemble of probabilities
        home_win = (
            poisson_result["home_win_prob"] * self.poisson_weight
            + xgboost_result["home_win_prob"] * self.xgboost_weight
        )
        draw = (
            poisson_result["draw_prob"] * self.poisson_weight
            + xgboost_result["draw_prob"] * self.xgboost_weight
        )
        away_win = (
            poisson_result["away_win_prob"] * self.poisson_weight
            + xgboost_result["away_win_prob"] * self.xgboost_weight
        )

        # Normalize
        total = home_win + draw + away_win
        if total > 0:
            home_win /= total
            draw /= total
            away_win /= total

        return {
            "home_win_prob": home_win,
            "draw_prob": draw,
            "away_win_prob": away_win,
            # Score predictions come from Poisson (XGBoost only does outcome)
            "predicted_home_score": poisson_result.get("predicted_home_score", 0),
            "predicted_away_score": poisson_result.get("predicted_away_score", 0),
        }
