"""
Walk-forward backtest harness for the Dixon-Coles model.

Train on the past, score held-out future matches — so model changes (ridge
shrinkage, temperature calibration, decay, neutral handling) can be judged by
out-of-sample calibration/accuracy instead of guesswork. Used by tests as a
regression guard and runnable ad-hoc to tune hyper-parameters.

Metrics (lower is better unless noted):
  - brier:    multiclass Brier score; uniform 1/3 baseline = 0.6667
  - log_loss: cross-entropy; uniform baseline = ln(3) ≈ 1.0986
  - rps:      ranked probability score (ordinal 1X2); uniform ≈ 0.2222
  - accuracy: 1X2 hit rate (higher is better)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import numpy as np

from app.models.dixon_coles import DixonColesModel, Match

UNIFORM_BRIER = 2.0 / 3.0
UNIFORM_LOGLOSS = float(np.log(3.0))


@dataclass(slots=True)
class BacktestResult:
    n: int
    brier: float
    log_loss: float
    rps: float
    accuracy: float


def _outcome(hg: int, ag: int) -> int:
    return 0 if hg > ag else (1 if hg == ag else 2)


def backtest(
    matches: Sequence[Match],
    train_frac: float = 0.7,
    xi: float = 0.0018,
    reg_lambda: float = 5.0,
    prob_temperature: float = 1.0,
    neutral: bool = False,
) -> BacktestResult:
    """Chronological split: fit on the first `train_frac`, score the rest.
    Only test matches whose both teams were seen in training are scored."""
    ms = sorted(matches, key=lambda m: m.match_date)
    if len(ms) < 20:
        raise ValueError("need >=20 matches to backtest")
    cut = int(len(ms) * train_frac)
    train, test = ms[:cut], ms[cut:]
    if not train or not test:
        raise ValueError("train/test split produced an empty side")

    model = DixonColesModel(xi=xi, reg_lambda=reg_lambda)
    model.fit(train)
    rated = set(model.ratings.teams) if model.ratings else set()

    n = 0
    brier = ll = rps = 0.0
    hits = 0
    for m in test:
        if m.home not in rated or m.away not in rated:
            continue
        pred = model.predict(
            m.home, m.away, neutral=neutral, prob_temperature=prob_temperature
        )
        p = [pred["home_win"], pred["draw"], pred["away_win"]]
        o = _outcome(m.home_goals, m.away_goals)
        oz = [1.0 if i == o else 0.0 for i in range(3)]

        brier += sum((p[i] - oz[i]) ** 2 for i in range(3))
        ll += -float(np.log(min(max(p[o], 1e-9), 1.0)))
        c1 = p[0] - oz[0]
        c2 = (p[0] + p[1]) - (oz[0] + oz[1])
        rps += (c1 * c1 + c2 * c2) / 2.0
        if max(range(3), key=lambda i: p[i]) == o:
            hits += 1
        n += 1

    if n == 0:
        raise ValueError("no scorable test matches (teams unseen in training)")
    return BacktestResult(
        n=n,
        brier=brier / n,
        log_loss=ll / n,
        rps=rps / n,
        accuracy=hits / n,
    )
