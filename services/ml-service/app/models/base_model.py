from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BasePredictor(ABC):
    """Abstract base class for all prediction models."""

    @abstractmethod
    def predict(self, features: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """
        Generate prediction from features.

        Returns:
            Dict with keys: home_win_prob, draw_prob, away_win_prob
            Optional keys: predicted_home_score, predicted_away_score
            Returns None if model cannot predict.
        """
        pass

    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Return model metadata."""
        pass

    @abstractmethod
    def is_ready(self) -> bool:
        """Check if model is loaded and ready for predictions."""
        pass
