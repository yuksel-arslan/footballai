import numpy as np
from typing import Dict, Any, Optional, List
from pathlib import Path
from .base_model import BasePredictor

try:
    import xgboost as xgb
    import joblib
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False


class XGBoostPredictor(BasePredictor):
    """
    XGBoost-based match outcome classifier.

    Predicts match outcome (Home Win / Draw / Away Win) using
    gradient-boosted decision trees. Requires training data to be
    useful; falls back gracefully if no trained model exists.
    """

    FEATURE_NAMES: List[str] = [
        'home_form_score', 'away_form_score',
        'home_attack_strength', 'away_attack_strength',
        'home_defense_strength', 'away_defense_strength',
        'home_goals_per_game', 'away_goals_per_game',
        'home_conceded_per_game', 'away_conceded_per_game',
        'home_clean_sheet_rate', 'away_clean_sheet_rate',
        'league_position_diff', 'home_points', 'away_points',
        'h2h_home_win_rate', 'h2h_draw_rate',
        'home_win_rate', 'away_win_rate',
        'home_home_win_rate', 'away_away_win_rate',
    ]

    def __init__(self):
        self.model = None
        self.model_version = "v1.0.0-xgboost"
        self.model_path = Path("trained_models/xgboost_v1.joblib")
        self._ready = False

    def load(self):
        """Load trained XGBoost model from disk, if it exists."""
        if not HAS_XGBOOST:
            print("  XGBoost not installed, skipping")
            return

        if self.model_path.exists():
            try:
                self.model = joblib.load(self.model_path)
                self._ready = True
                print(f"  XGBoost model loaded from {self.model_path}")
            except Exception as e:
                print(f"  XGBoost model load failed: {e}")
        else:
            print("  XGBoost model not found (not yet trained), using fallback")

    def is_ready(self) -> bool:
        return self._ready and self.model is not None

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_type": "XGBoost Classifier",
            "version": self.model_version,
            "description": "Gradient-boosted decision tree for match outcome classification",
            "features_count": len(self.FEATURE_NAMES),
            "features": self.FEATURE_NAMES,
            "trained": self.is_ready(),
        }

    def predict(self, features: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """
        Predict match outcome probabilities using XGBoost.

        Returns None if model is not trained/loaded.
        """
        if not self.is_ready():
            return None

        try:
            X = np.array([[features.get(f, 0.0) for f in self.FEATURE_NAMES]])
            probs = self.model.predict_proba(X)[0]  # [home, draw, away]

            return {
                "home_win_prob": float(probs[0]),
                "draw_prob": float(probs[1]),
                "away_win_prob": float(probs[2]),
            }
        except Exception as e:
            print(f"XGBoost prediction error: {e}")
            return None

    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """
        Train XGBoost model on labeled data.

        Args:
            X: Feature matrix (n_samples, n_features)
            y: Labels (0=home_win, 1=draw, 2=away_win)

        Returns:
            Training metrics dict.
        """
        if not HAS_XGBOOST:
            return {"error": "XGBoost not installed"}

        from sklearn.model_selection import cross_val_score

        self.model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            objective='multi:softprob',
            num_class=3,
            eval_metric='mlogloss',
            use_label_encoder=False,
            random_state=42,
        )

        self.model.fit(X, y)

        # Cross-validation score
        cv_scores = cross_val_score(self.model, X, y, cv=5, scoring='accuracy')

        # Save model
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, self.model_path)
        self._ready = True

        metrics = {
            "accuracy_mean": float(cv_scores.mean()),
            "accuracy_std": float(cv_scores.std()),
            "n_samples": int(X.shape[0]),
            "n_features": int(X.shape[1]),
            "model_path": str(self.model_path),
        }

        print(f"  XGBoost trained: accuracy={cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
        return metrics
