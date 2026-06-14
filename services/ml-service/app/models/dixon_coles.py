"""
Dixon-Coles bivariate Poisson model for football match prediction.

Reference: Dixon & Coles (1997), "Modelling Association Football Scores and
Inefficiencies in the Football Betting Market", Applied Statistics 46(2).

Key extensions over naive independent-Poisson:
  - tau correction (rho) for low-score dependence (0-0, 1-0, 0-1, 1-1)
  - exponential time-decay weighting of historical matches
  - per-team attack/defence ratings + home advantage, fit by MLE
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Sequence

import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson


@dataclass(slots=True)
class Match:
    """A single observed match used to fit the model."""

    home: str
    away: str
    home_goals: int
    away_goals: int
    match_date: date


@dataclass(slots=True)
class TeamRatings:
    attack: dict[str, float]
    defence: dict[str, float]
    home_adv: float
    rho: float
    teams: list[str] = field(default_factory=list)


def _tau(h: int, a: int, lam: float, mu: float, rho: float) -> float:
    """Dixon-Coles low-score dependence correction."""
    if h == 0 and a == 0:
        return 1.0 - lam * mu * rho
    if h == 0 and a == 1:
        return 1.0 + lam * rho
    if h == 1 and a == 0:
        return 1.0 + mu * rho
    if h == 1 and a == 1:
        return 1.0 - rho
    return 1.0


def _time_weights(dates: Sequence[date], ref: date, xi: float) -> np.ndarray:
    """Exponential decay: weight = exp(-xi * days_ago). xi in 1/days."""
    days = np.array([(ref - d).days for d in dates], dtype=float)
    return np.exp(-xi * np.clip(days, 0, None))


class DixonColesModel:
    """Fits team strength parameters and produces match score distributions."""

    def __init__(
        self, xi: float = 0.0018, max_goals: int = 10, reg_lambda: float = 5.0
    ) -> None:
        # xi ~ 0.0018/day => ~half-life of one year. Tune via backtest.
        # reg_lambda: ridge (L2) shrinkage pulling team attack/defence spread
        # toward the mean ("all teams equal" prior). Thin-sample sides (few or
        # weakly-informative matches) are pulled in much harder than
        # well-sampled ones, so a minnow can't earn an extreme rating from a
        # soft schedule. 0 disables. Tune via backtest.
        self.xi = xi
        self.max_goals = max_goals
        self.reg_lambda = reg_lambda
        self.ratings: TeamRatings | None = None

    # ----------------------------------------------------------------- fit
    def fit(self, matches: Sequence[Match], ref_date: date | None = None) -> TeamRatings:
        if not matches:
            raise ValueError("no matches provided to fit()")
        ref_date = ref_date or max(m.match_date for m in matches)
        teams = sorted({m.home for m in matches} | {m.away for m in matches})
        idx = {t: i for i, t in enumerate(teams)}
        n = len(teams)

        hg = np.array([m.home_goals for m in matches])
        ag = np.array([m.away_goals for m in matches])
        hi = np.array([idx[m.home] for m in matches])
        ai = np.array([idx[m.away] for m in matches])
        w = _time_weights([m.match_date for m in matches], ref_date, self.xi)

        # params: [attack(n), defence(n), home_adv, rho]
        # constraint applied via mean-centering of attack each eval (identifiability)
        x0 = np.concatenate([np.zeros(n), np.zeros(n), [0.25], [-0.05]])

        def neg_log_lik(params: np.ndarray) -> float:
            att = params[:n].copy()
            att -= att.mean()  # identifiability: sum(attack)=0
            dfn = params[n : 2 * n]
            home_adv = params[2 * n]
            rho = params[2 * n + 1]

            lam = np.exp(home_adv + att[hi] + dfn[ai])   # home expected goals
            mu = np.exp(att[ai] + dfn[hi])               # away expected goals

            ll = (
                poisson.logpmf(hg, lam)
                + poisson.logpmf(ag, mu)
            )
            tau = np.array([_tau(int(h), int(a), float(l), float(m_), rho)
                            for h, a, l, m_ in zip(hg, ag, lam, mu)])
            tau = np.clip(tau, 1e-9, None)
            ll = ll + np.log(tau)

            # Ridge prior on the rating SPREAD (deviation from the mean), so
            # the penalty regularises team-to-team differences without biasing
            # the overall goal level. Attack is already mean-centred; centre
            # defence here too. Parameters the data barely constrains (thin
            # samples) shrink most — exactly the minnow over-rating fix.
            penalty = 0.0
            if self.reg_lambda > 0.0:
                dfn_c = dfn - dfn.mean()
                penalty = self.reg_lambda * (
                    float(att @ att) + float(dfn_c @ dfn_c)
                )
            return -np.sum(w * ll) + penalty

        res = minimize(
            neg_log_lik, x0, method="L-BFGS-B",
            bounds=[(-3, 3)] * (2 * n) + [(-1, 1), (-0.2, 0.2)],
            options={"maxiter": 500, "ftol": 1e-9},
        )
        p = res.x
        att = p[:n] - p[:n].mean()
        self.ratings = TeamRatings(
            attack={t: float(att[i]) for t, i in idx.items()},
            defence={t: float(p[n + i]) for t, i in idx.items()},
            home_adv=float(p[2 * n]),
            rho=float(p[2 * n + 1]),
            teams=teams,
        )
        return self.ratings

    # ------------------------------------------------------------- predict
    def score_matrix(self, home: str, away: str, neutral: bool = False) -> np.ndarray:
        r = self._require_ratings()
        for t in (home, away):
            if t not in r.attack:
                raise KeyError(f"team '{t}' not in fitted ratings")
        ha = 0.0 if neutral else r.home_adv
        lam = np.exp(ha + r.attack[home] + r.defence[away])
        mu = np.exp(r.attack[away] + r.defence[home])

        k = np.arange(self.max_goals + 1)
        ph = poisson.pmf(k, lam)
        pa = poisson.pmf(k, mu)
        M = np.outer(ph, pa)

        # apply tau correction on the 2x2 low-score cell block
        for h in range(2):
            for a in range(2):
                M[h, a] *= _tau(h, a, lam, mu, r.rho)
        M /= M.sum()  # renormalise after correction
        return M

    def predict(
        self,
        home: str,
        away: str,
        neutral: bool = False,
        live: dict | None = None,
    ) -> dict:
        """Full-match outcome probabilities.

        When `live` is given ({minute, home_goals, away_goals}) the prediction
        is conditioned on the in-play state: the remaining-time goal rates are
        the full-match rates scaled by the unplayed fraction, and the final
        score distribution is the current score plus the remaining-goals
        distribution. At minute>=90 this collapses to the current result.
        """
        if live is not None:
            return self._predict_live(home, away, neutral, live)
        M = self.score_matrix(home, away, neutral)
        return self._summarise(M, home_offset=0, away_offset=0)

    def _predict_live(
        self, home: str, away: str, neutral: bool, live: dict
    ) -> dict:
        r = self._require_ratings()
        for t in (home, away):
            if t not in r.attack:
                raise KeyError(f"team '{t}' not in fitted ratings")
        minute = max(0, int(live["minute"]))
        ch = int(live["home_goals"])
        ca = int(live["away_goals"])
        remain = max(0.0, (90 - min(minute, 90)) / 90.0)

        ha = 0.0 if neutral else r.home_adv
        lam = np.exp(ha + r.attack[home] + r.defence[away]) * remain
        mu = np.exp(r.attack[away] + r.defence[home]) * remain

        # Remaining-goals distribution: independent Poisson (the tau low-score
        # correction models full-match 0-0/1-1 dependence and doesn't apply to
        # a partial segment).
        k = np.arange(self.max_goals + 1)
        M = np.outer(poisson.pmf(k, lam), poisson.pmf(k, mu))
        M /= M.sum()
        return self._summarise(M, home_offset=ch, away_offset=ca)

    def _summarise(self, M: np.ndarray, home_offset: int, away_offset: int) -> dict:
        """Turn a (remaining-)goals matrix into final-outcome probabilities.
        Offsets shift every scoreline by the current score (0 pre-match)."""
        n_h, n_a = M.shape
        hg = home_offset + np.arange(n_h)[:, None]
        ag = away_offset + np.arange(n_a)[None, :]

        p_home = float(M[hg > ag].sum())
        p_draw = float(M[hg == ag].sum())
        p_away = float(M[hg < ag].sum())

        total = hg + ag
        over25 = float(M[total >= 3].sum())
        btts = float(M[(hg >= 1) & (ag >= 1)].sum())

        flat = sorted(
            (
                (home_offset + i, away_offset + j, float(M[i, j]))
                for i in range(n_h)
                for j in range(n_a)
            ),
            key=lambda x: -x[2],
        )
        return {
            "home_win": p_home,
            "draw": p_draw,
            "away_win": p_away,
            "over_2_5": over25,
            "under_2_5": 1 - over25,
            "btts_yes": btts,
            "btts_no": 1 - btts,
            "expected_home_goals": float((hg * M).sum()),
            "expected_away_goals": float((ag * M).sum()),
            "top_scorelines": [
                {"home": h, "away": a, "prob": p} for h, a, p in flat[:6]
            ],
        }

    def _require_ratings(self) -> TeamRatings:
        if self.ratings is None:
            raise RuntimeError("model not fitted; call fit() first")
        return self.ratings
