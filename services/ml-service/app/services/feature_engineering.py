from typing import Dict, Any, Optional


class FeatureEngineer:
    """Extract ML features from team statistics and H2H data."""

    @staticmethod
    def _form_score(form: Optional[str]) -> float:
        """Calculate form score from last 5 matches (WWDLW format)."""
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

    @staticmethod
    def _attack_strength(stats: Dict) -> float:
        mp = max(stats.get('matches_played', 0), 1)
        return stats.get('goals_for', 0) / mp / 1.3

    @staticmethod
    def _defense_strength(stats: Dict) -> float:
        mp = max(stats.get('matches_played', 0), 1)
        return stats.get('goals_against', 0) / mp / 1.3

    def extract_features(
        self,
        home_stats: Dict[str, Any],
        away_stats: Dict[str, Any],
        h2h: Dict[str, Any],
    ) -> Dict[str, float]:
        """
        Extract ML features from raw stats.

        Returns a dict with keys matching XGBoostPredictor.FEATURE_NAMES.
        """
        home_mp = max(home_stats.get('matches_played', 1), 1)
        away_mp = max(away_stats.get('matches_played', 1), 1)
        h2h_total = max(h2h.get('total_games', 0), 1)

        return {
            # Form features
            'home_form_score': self._form_score(home_stats.get('last_five_form')),
            'away_form_score': self._form_score(away_stats.get('last_five_form')),

            # Attack/Defense
            'home_attack_strength': self._attack_strength(home_stats),
            'away_attack_strength': self._attack_strength(away_stats),
            'home_defense_strength': self._defense_strength(home_stats),
            'away_defense_strength': self._defense_strength(away_stats),

            # Goals per game
            'home_goals_per_game': home_stats.get('goals_for', 0) / home_mp,
            'away_goals_per_game': away_stats.get('goals_for', 0) / away_mp,
            'home_conceded_per_game': home_stats.get('goals_against', 0) / home_mp,
            'away_conceded_per_game': away_stats.get('goals_against', 0) / away_mp,

            # Clean sheets
            'home_clean_sheet_rate': home_stats.get('clean_sheets', 0) / home_mp,
            'away_clean_sheet_rate': away_stats.get('clean_sheets', 0) / away_mp,

            # Position
            'league_position_diff': (away_stats.get('league_position') or 10) - (home_stats.get('league_position') or 10),
            'home_points': home_stats.get('points', 0),
            'away_points': away_stats.get('points', 0),

            # H2H
            'h2h_home_win_rate': h2h.get('home_wins', 0) / h2h_total,
            'h2h_draw_rate': h2h.get('draws', 0) / h2h_total,

            # Win rates
            'home_win_rate': home_stats.get('wins', 0) / home_mp,
            'away_win_rate': away_stats.get('wins', 0) / away_mp,
            'home_home_win_rate': home_stats.get('home_wins', 0) / max(home_mp / 2, 1),
            'away_away_win_rate': away_stats.get('away_wins', 0) / max(away_mp / 2, 1),
        }
