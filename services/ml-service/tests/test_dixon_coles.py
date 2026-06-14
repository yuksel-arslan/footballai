"""Tests for the Dixon-Coles model and the value-bet engine.

Runnable with pytest (`pytest tests/test_dixon_coles.py`) or directly
(`python tests/test_dixon_coles.py`).
"""
from datetime import date, timedelta

import numpy as np

from app.models.dixon_coles import DixonColesModel, Match
from app.services.value_engine import analyse, remove_vig, kelly_fraction


def _synthetic_league(seasons: int = 20):
    """Generate matches from known strengths so we can check parameter recovery."""
    rng = np.random.default_rng(0)
    teams = ["A", "B", "C", "D", "E", "F"]
    true_atk = dict(zip(teams, [0.5, 0.3, 0.0, -0.1, -0.3, -0.4]))
    true_def = dict(zip(teams, [-0.4, -0.2, 0.0, 0.1, 0.2, 0.3]))
    home_adv = 0.25
    base = date(2025, 1, 1)
    matches = []
    for r in range(seasons):
        for i, h in enumerate(teams):
            for j, a in enumerate(teams):
                if i == j:
                    continue
                lam = np.exp(home_adv + true_atk[h] + true_def[a])
                mu = np.exp(true_atk[a] + true_def[h])
                matches.append(
                    Match(h, a, int(rng.poisson(lam)), int(rng.poisson(mu)),
                          base + timedelta(days=r * 7))
                )
    return matches, teams, true_atk, home_adv


def test_fit_recovers_parameters():
    matches, teams, true_atk, home_adv = _synthetic_league()
    model = DixonColesModel(xi=0.0)  # no decay for a stationary synthetic league
    ratings = model.fit(matches)

    fitted = np.array([ratings.attack[t] for t in teams])
    truth = np.array([true_atk[t] for t in teams])
    corr = np.corrcoef(truth, fitted)[0, 1]
    assert corr > 0.9, f"attack ratings poorly recovered (corr={corr:.3f})"
    assert abs(ratings.home_adv - home_adv) < 0.1, ratings.home_adv


def test_shrinkage_reduces_rating_spread():
    # On a thin sample, ridge shrinkage must pull team ratings toward the mean
    # (smaller spread) so minnows can't earn extreme ratings from little data.
    matches, teams, *_ = _synthetic_league(seasons=1)
    plain = DixonColesModel(xi=0.0, reg_lambda=0.0).fit(matches)
    shrunk = DixonColesModel(xi=0.0, reg_lambda=25.0).fit(matches)
    spread_plain = np.std([plain.attack[t] for t in teams])
    spread_shrunk = np.std([shrunk.attack[t] for t in teams])
    assert spread_shrunk < spread_plain, (spread_plain, spread_shrunk)


def test_probabilities_sum_to_one():
    matches, *_ = _synthetic_league()
    model = DixonColesModel(xi=0.0)
    model.fit(matches)
    pred = model.predict("A", "F")
    total = pred["home_win"] + pred["draw"] + pred["away_win"]
    assert abs(total - 1.0) < 1e-9, total
    assert abs((pred["over_2_5"] + pred["under_2_5"]) - 1.0) < 1e-9


def test_devig_and_value():
    odds = {"home": 1.80, "draw": 3.70, "away": 4.75}
    fair, overround = remove_vig(odds)
    assert overround > 1.0  # always positive margin
    assert abs(sum(fair.values()) - 1.0) < 1e-9

    # A clear +EV edge on home: model 60% vs ~53.6% fair.
    res = analyse({"home": 0.60, "draw": 0.22, "away": 0.18}, odds)
    home = next(r for r in res if r.selection == "home")
    assert home.ev_per_unit > 0
    assert home.is_value
    assert 0 < home.rec_kelly <= home.full_kelly  # quarter-Kelly <= full


def test_no_bet_on_negative_ev():
    # Model agrees with the (vig-laden) market => no value anywhere.
    odds = {"home": 1.80, "draw": 3.70, "away": 4.75}
    fair, _ = remove_vig(odds)
    res = analyse(fair, odds)  # model == fair probs
    assert all(not r.is_value for r in res)


def test_kelly_negative_returns_zero():
    assert kelly_fraction(0.3, 2.0) <= 0  # 30% at evens is a losing bet


def test_absurd_edge_not_flagged_as_value():
    # Miscalibrated model: a heavy underdog at a long price. The implausibly
    # large model/market gap must NOT be flagged as value (sanity gates +
    # shrinkage), and the recommended stake stays capped.
    res = analyse(
        {"home": 0.50, "draw": 0.05, "away": 0.45},
        {"home": 1.02, "draw": 26.0, "away": 60.0},
    )
    away = next(r for r in res if r.selection == "away")
    assert not away.is_value  # edge/odds too extreme to trust
    assert all(r.rec_kelly <= 0.03 for r in res)  # weight cap holds


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"PASS {name}")
    print("All Dixon-Coles tests passed.")
