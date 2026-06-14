"""
Value-betting engine.

Converts model probabilities + market odds into:
  - vig-free (overround-adjusted) market probabilities
  - per-selection edge and expected value (EV)
  - fractional Kelly stake recommendations

Design choice: we never recommend a stake on negative-EV selections, and we
default to quarter-Kelly to control variance — full Kelly is too aggressive
for the parameter uncertainty inherent in football models.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ValueResult:
    selection: str
    odds: float
    model_prob: float
    market_prob_vigfree: float
    edge: float          # model_prob - market_prob_vigfree
    ev_per_unit: float   # model_prob * odds - 1
    full_kelly: float    # fraction of bankroll
    rec_kelly: float     # fraction after kelly_fraction applied
    is_value: bool


def remove_vig(odds: dict[str, float]) -> tuple[dict[str, float], float]:
    """Multiplicative (proportional) vig removal. Returns (fair_probs, overround)."""
    implied = {k: 1.0 / v for k, v in odds.items()}
    overround = sum(implied.values())
    fair = {k: v / overround for k, v in implied.items()}
    return fair, overround


def kelly_fraction(prob: float, odds: float) -> float:
    """Full Kelly fraction for a single outcome. Negative => no bet."""
    b = odds - 1.0
    if b <= 0:
        return 0.0
    return (b * prob - (1.0 - prob)) / b


def analyse(
    model_probs: dict[str, float],
    odds: dict[str, float],
    kelly_frac: float = 0.25,
    min_edge: float = 0.03,
    model_weight: float = 0.7,
    max_edge: float = 0.12,
    max_odds: float = 12.0,
    max_weight: float = 0.03,
) -> list[ValueResult]:
    """
    model_probs and odds must share keys (e.g. 'home', 'draw', 'away').

    Robustness (so a miscalibrated model can't surface absurd "value"):
      - model_weight: shrink the model probability TOWARD the vig-free market
        (a strong prior). A huge model/market gap is usually model error, not
        edge; blending tames it. The blended probability is what we stake on.
      - max_edge / max_odds: hard sanity gates — an implausibly large edge or
        an extreme longshot is not flagged as value.
      - max_weight: cap the recommended stake (a large Kelly is itself a sign
        of miscalibration).
    """
    fair, _ = remove_vig(odds)
    out: list[ValueResult] = []
    for sel, o in odds.items():
        raw = model_probs[sel]
        # Calibrated probability: lean on the model but anchor to the market.
        p = model_weight * raw + (1.0 - model_weight) * fair[sel]
        ev = p * o - 1.0
        edge = p - fair[sel]
        fk = kelly_fraction(p, o)
        is_value = (
            ev >= min_edge
            and fk > 0.0
            and edge <= max_edge
            and o <= max_odds
        )
        out.append(
            ValueResult(
                selection=sel,
                odds=o,
                model_prob=p,
                market_prob_vigfree=fair[sel],
                edge=edge,
                ev_per_unit=ev,
                full_kelly=fk,
                rec_kelly=min(max(fk, 0.0) * kelly_frac, max_weight),
                is_value=is_value,
            )
        )
    return sorted(out, key=lambda r: -r.ev_per_unit)
