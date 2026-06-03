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

    def __init__(self, xi: float = 0.0018, max_goals: int = 10) -> None:
        # xi ~ 0.0018/day => ~half-life of one year. Tune via backtest.
        self.xi = xi
        self.max_goals = max_goals
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
            return -np.sum(w * ll)

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

    def predict(self, home: str, away: str, neutral: bool = False) -> dict:
        M = self.score_matrix(home, away, neutral)
        p_home = float(np.tril(M, -1).sum())
        p_draw = float(np.trace(M))
        p_away = float(np.triu(M, 1).sum())

        gg = np.add.outer(np.arange(M.shape[0]), np.arange(M.shape[1]))
        over25 = float(M[gg >= 3].sum())
        btts = float(M[1:, 1:].sum())

        flat = sorted(
            ((i, j, float(M[i, j])) for i in range(M.shape[0]) for j in range(M.shape[1])),
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
            "expected_home_goals": float((np.arange(M.shape[0])[:, None] * M).sum()),
            "expected_away_goals": float((np.arange(M.shape[1])[None, :] * M).sum()),
            "top_scorelines": [
                {"home": i, "away": j, "prob": p} for i, j, p in flat[:6]
            ],
        }

    def _require_ratings(self) -> TeamRatings:
        if self.ratings is None:
            raise RuntimeError("model not fitted; call fit() first")
        return self.ratings
