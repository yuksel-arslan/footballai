import numpy as np
from typing import Dict, Any, List, Optional
from app.models.xgboost_model import XGBoostPredictor
from app.services.feature_engineering import FeatureEngineer


class TrainingService:
    """Service for training ML models with historical match data."""

    def __init__(self, xgboost_model: XGBoostPredictor):
        self.xgboost = xgboost_model
        self.feature_engineer = FeatureEngineer()
        self._training_in_progress = False
        self._last_metrics: Optional[Dict[str, Any]] = None

    def is_training(self) -> bool:
        return self._training_in_progress

    def get_last_metrics(self) -> Optional[Dict[str, Any]]:
        return self._last_metrics

    def prepare_training_data(
        self, matches: List[Dict[str, Any]]
    ) -> tuple:
        """
        Convert match history to feature matrix and labels.

        Each match dict should contain:
        - home_stats: dict of home team stats at time of match
        - away_stats: dict of away team stats at time of match
        - h2h: dict of head-to-head stats
        - result: 0 (home_win), 1 (draw), 2 (away_win)
        """
        X_list = []
        y_list = []

        for match in matches:
            features = self.feature_engineer.extract_features(
                match.get('home_stats', {}),
                match.get('away_stats', {}),
                match.get('h2h', {}),
            )
            feature_values = [features.get(f, 0.0) for f in XGBoostPredictor.FEATURE_NAMES]
            X_list.append(feature_values)
            y_list.append(match.get('result', 0))

        return np.array(X_list), np.array(y_list)

    def train(self, matches: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Train XGBoost model with match data.

        Returns training metrics.
        """
        if self._training_in_progress:
            return {"error": "Training already in progress"}

        if len(matches) < 50:
            return {"error": f"Need at least 50 matches for training, got {len(matches)}"}

        self._training_in_progress = True
        try:
            X, y = self.prepare_training_data(matches)
            metrics = self.xgboost.train(X, y)
            self._last_metrics = metrics
            return metrics
        finally:
            self._training_in_progress = False
