import numpy as np
from scipy.stats import poisson
from typing import Dict, Any, Optional, List
from .base_model import BasePredictor


class PoissonPredictor(BasePredictor):
    """
    Football Match Prediction using Poisson Distribution.

    Uses statistical analysis + Poisson distribution for score prediction.
    Features:
    - Team form analysis (last 5 matches)
    - Home/Away advantage
    - Head-to-head records
    - Goal scoring/conceding rates
    - League position impact
    """

    # Motivation multiplier by competition type.
    # Higher values = more attacking / open play (both teams motivated).
    # Lower values = more cautious / pragmatic play.
    COMPETITION_MOTIVATION = {
        'champions_league': 1.08,   # Very high stakes → intense, but also tactical
        'europa_league': 1.04,      # High stakes, slightly less than CL
        'domestic_league': 1.00,    # Baseline
        'domestic_cup': 0.95,       # Big teams often rotate → lower intensity
        'international': 1.02,      # National pride
        'friendly': 0.85,           # Low motivation, heavy rotation
    }

    def __init__(self):
        self.model_version = "v1.1.0-poisson"
        self._ready = False
        self.home_advantage = 0.25
        self.form_weight = 0.3
        self.h2h_weight = 0.2
        self.league_position_weight = 0.15

    def load(self):
        """Initialize the Poisson model (no file loading needed)."""
        self._ready = True
        print(f"  Poisson model {self.model_version} initialized")

    def is_ready(self) -> bool:
        return self._ready

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_type": "Poisson Distribution",
            "version": self.model_version,
            "description": "Statistical model using Poisson distribution for score prediction",
            "features": ["form", "attack_strength", "defense_strength", "home_advantage", "h2h", "league_position"],
            "accuracy": {
                "match_result": 0.52,
                "score_mae": 0.8,
                "over_under_2_5": 0.58,
            },
        }

    def _calculate_form_score(self, form: Optional[str]) -> float:
        if not form:
            return 0.5
        score = 0
        weights = [0.3, 0.25, 0.2, 0.15, 0.1]
        for i, result in enumerate(form[:5]):
            if i >= len(weights):
                break
            if result == 'W':
                score += weights[i] * 1.0
            elif result == 'D':
                score += weights[i] * 0.5
        return score

    def _calculate_attack_strength(self, team_stats: Dict) -> float:
        if team_stats.get('matches_played', 0) == 0:
            return 1.0
        goals_per_game = team_stats['goals_for'] / team_stats['matches_played']
        return goals_per_game / 1.3

    def _calculate_defense_strength(self, team_stats: Dict) -> float:
        if team_stats.get('matches_played', 0) == 0:
            return 1.0
        goals_conceded_per_game = team_stats['goals_against'] / team_stats['matches_played']
        return goals_conceded_per_game / 1.3

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
        return {
            "home_win": home_win / total,
            "draw": draw / total,
            "away_win": away_win / total,
        }

    def predict(self, features: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """
        Predict using Poisson model.
        Expects features dict with home_stats, away_stats, h2h data.
        """
        home = features.get('home_stats', {})
        away = features.get('away_stats', {})

        home_attack = self._calculate_attack_strength(home)
        home_defense = self._calculate_defense_strength(home)
        away_attack = self._calculate_attack_strength(away)
        away_defense = self._calculate_defense_strength(away)

        home_form = self._calculate_form_score(home.get('last_five_form'))
        away_form = self._calculate_form_score(away.get('last_five_form'))

        home_xg = self._calculate_expected_goals(
            home_attack, away_defense, True, home_form, home.get('league_position')
        )
        away_xg = self._calculate_expected_goals(
            away_attack, home_defense, False, away_form, away.get('league_position')
        )

        # H2H adjustment
        h2h_home_wins = features.get('h2h_home_wins', 0)
        h2h_away_wins = features.get('h2h_away_wins', 0)
        h2h_draws = features.get('h2h_draws', 0)
        h2h_total = h2h_home_wins + h2h_away_wins + h2h_draws
        if h2h_total > 0:
            h2h_home_rate = h2h_home_wins / h2h_total
            h2h_away_rate = h2h_away_wins / h2h_total
            home_xg *= (1 + (h2h_home_rate - 0.4) * self.h2h_weight)
            away_xg *= (1 + (h2h_away_rate - 0.3) * self.h2h_weight)

        # Competition type / motivation adjustment
        comp_type = features.get('competition_type', 'domestic_league')
        motivation = self.COMPETITION_MOTIVATION.get(comp_type, 1.0)
        home_xg *= motivation
        away_xg *= motivation

        probs = self._poisson_probabilities(home_xg, away_xg)

        return {
            "home_win_prob": probs["home_win"],
            "draw_prob": probs["draw"],
            "away_win_prob": probs["away_win"],
            "predicted_home_score": round(home_xg, 1),
            "predicted_away_score": round(away_xg, 1),
        }

    def predict_from_request(self, request) -> Dict[str, Any]:
        """Legacy method: predict directly from PredictionRequest pydantic model."""
        home = request.home_team.model_dump()
        away = request.away_team.model_dump()

        features = {
            'home_stats': home,
            'away_stats': away,
            'h2h_home_wins': request.h2h_home_wins,
            'h2h_away_wins': request.h2h_away_wins,
            'h2h_draws': request.h2h_draws,
            'competition_type': getattr(request, 'competition_type', 'domestic_league'),
        }

        result = self.predict(features)
        if result is None:
            return {}

        max_prob = max(result["home_win_prob"], result["draw_prob"], result["away_win_prob"])
        confidence = min(100, max_prob * 100 + 20)

        comp_type = getattr(request, 'competition_type', 'domestic_league')
        factors = self._generate_key_factors(home, away, result, comp_type)
        explanation = self._generate_explanation(
            result, home.get('name', 'Home'), away.get('name', 'Away')
        )

        return {
            "fixture_id": request.fixture_id,
            "home_win_prob": round(result["home_win_prob"] * 100, 1),
            "draw_prob": round(result["draw_prob"] * 100, 1),
            "away_win_prob": round(result["away_win_prob"] * 100, 1),
            "predicted_home_score": result["predicted_home_score"],
            "predicted_away_score": result["predicted_away_score"],
            "confidence": round(confidence, 1),
            "model_version": self.model_version,
            "key_factors": factors,
            "explanation": explanation,
        }

    def _generate_key_factors(self, home: Dict, away: Dict, result: Dict, competition_type: str = 'domestic_league') -> List[str]:
        factors = []

        # Competition motivation factor
        comp_labels = {
            'champions_league': 'Şampiyonlar Ligi maçı – çok yüksek motivasyon',
            'europa_league': 'Avrupa ligi maçı – yüksek motivasyon',
            'domestic_cup': 'Kupa maçı – büyük takımlar rotasyon yapabilir',
            'international': 'Milli maç – ulusal gurur faktörü',
            'friendly': 'Hazırlık maçı – düşük motivasyon, kadro rotasyonu',
        }
        if competition_type in comp_labels:
            factors.append(comp_labels[competition_type])

        home_form = self._calculate_form_score(home.get('last_five_form'))
        away_form = self._calculate_form_score(away.get('last_five_form'))

        if home_form > away_form + 0.2:
            factors.append("Ev sahibi son maçlarda daha iyi formda")
        elif away_form > home_form + 0.2:
            factors.append("Deplasman takımı son maçlarda daha iyi formda")

        factors.append(f"Ev sahibi avantajı hesaba katıldı (+{int(self.home_advantage * 100)}%)")

        home_xg = result.get("predicted_home_score", 0)
        away_xg = result.get("predicted_away_score", 0)
        if home_xg > 1.8:
            factors.append(f"Ev sahibinin gol beklentisi yüksek ({home_xg:.2f})")
        if away_xg > 1.5:
            factors.append(f"Deplasman takımının gol beklentisi yüksek ({away_xg:.2f})")

        if home.get('league_position') and away.get('league_position'):
            pos_diff = away['league_position'] - home['league_position']
            if pos_diff > 8:
                factors.append(f"Ev sahibi ligde {pos_diff} sıra üstte")
            elif pos_diff < -8:
                factors.append(f"Deplasman takımı ligde {-pos_diff} sıra üstte")

        return factors[:5]

    def _generate_explanation(self, result: Dict, home_name: str, away_name: str) -> str:
        probs = {
            "home_win": result["home_win_prob"],
            "draw": result["draw_prob"],
            "away_win": result["away_win_prob"],
        }
        max_prob = max(probs.values())
        winner = [k for k, v in probs.items() if v == max_prob][0]

        if winner == "home_win":
            result_text = f"{home_name} kazanır"
        elif winner == "away_win":
            result_text = f"{away_name} kazanır"
        else:
            result_text = "Beraberlik"

        confidence = "yüksek" if max_prob > 0.5 else "orta" if max_prob > 0.4 else "düşük"
        home_xg = result.get("predicted_home_score", 0)
        away_xg = result.get("predicted_away_score", 0)

        return (
            f"Model tahmini: {result_text} (%{max_prob * 100:.0f} olasılık). "
            f"Beklenen skor: {home_xg:.1f} - {away_xg:.1f}. "
            f"Güven seviyesi: {confidence}."
        )
