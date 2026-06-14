"""
Roulette Monte Carlo engine — real statistics, not folklore.

Two experiments:
  Part A  EV verification: tens of millions of independent spins per wheel,
          measuring the EMPIRICAL house edge per unit wagered. This is the
          ground truth every "system" must obey.
  Part B  Strategy sessions: thousands of simulated players, each with a real
          bankroll, table limits, a target and a ruin condition. We measure
          where each betting system actually lands.

Everything is vectorised across players (numpy); spins are looped. Results are
reproducible via a fixed seed. No external data — the numbers are generated
here, on the spot.
"""
from __future__ import annotations
import numpy as np

# ----------------------------------------------------------------------------
# Wheel definitions for an EVEN-MONEY bet (e.g. red/black), pays 1:1.
#   p_win      P(bet wins)
#   p_lose     P(bet loses the full stake)
#   p_half     P(la partage: lose only half the stake)   -- French wheel only
# Theoretical house edge on an even-money bet:
#   European : 1/37          = 2.7027 %
#   French   : 1/(2*37)      = 1.3514 %   (la partage halves the zero loss)
#   American : 2/38          = 5.2632 %
# ----------------------------------------------------------------------------
WHEELS = {
    "European (single 0)":      dict(p_win=18/37, p_half=0.0,    pockets=37),
    "French (la partage)":      dict(p_win=18/37, p_half=1/37,   pockets=37),
    "American (0 and 00)":      dict(p_win=18/38, p_half=0.0,    pockets=38),
}


def theoretical_edge(w):
    p_win = w["p_win"]
    p_half = w["p_half"]
    p_lose = 1.0 - p_win - p_half
    # net per 1 unit staked: +1 on win, -1 on full loss, -0.5 on half loss
    ev = p_win * 1 + p_lose * (-1) + p_half * (-0.5)
    return -ev  # house edge = -player EV


# ----------------------------------------------------------------------------
# PART A — empirical house edge from raw independent spins.
# ----------------------------------------------------------------------------
def part_a(n_spins=40_000_000, seed=1):
    print("=" * 74)
    print("PART A — EMPIRICAL HOUSE EDGE  (independent even-money spins)")
    print(f"         {n_spins:,} simulated spins per wheel, 1 unit staked each")
    print("=" * 74)
    rng = np.random.default_rng(seed)
    print(f"{'Wheel':<26}{'theory edge':>14}{'measured edge':>16}{'95% CI half':>14}")
    print("-" * 74)
    for name, w in WHEELS.items():
        p_win, p_half = w["p_win"], w["p_half"]
        p_lose = 1.0 - p_win - p_half
        # draw outcome per spin: 0=win(+1), 1=full loss(-1), 2=half loss(-0.5)
        u = rng.random(n_spins)
        net = np.where(u < p_win, 1.0,
              np.where(u < p_win + p_lose, -1.0, -0.5))
        mean_net = net.mean()
        measured_edge = -mean_net
        # standard error of the mean -> 95% CI
        ci = 1.96 * net.std() / np.sqrt(n_spins)
        print(f"{name:<26}{theoretical_edge(w)*100:>12.4f}%"
              f"{measured_edge*100:>14.4f}%{ci*100:>13.4f}%")
    print("-" * 74)
    print("Read: the measured edge sits on top of theory within noise. Every unit")
    print("you wager bleeds this fraction on average — independent of order.\n")


# ----------------------------------------------------------------------------
# PART B — strategy sessions. Vectorised across players, spin loop.
#
# Each player: bankroll, a base unit, a per-strategy bet rule. A player stops
# when (a) bankroll >= target, (b) cannot place the next bet (ruin/can't cover),
# or (c) max_spins reached. We then report the distribution of outcomes.
#
# Betting rules (all on the even-money bet):
#   flat        : always base.
#   martingale  : double after a loss, reset to base after a win.
#   grand_mart  : (double + 1 unit) after a loss, reset after a win.
#   dalembert   : +1 unit after a loss, -1 unit after a win (floor = base).
#   fibonacci   : step up Fibonacci on loss, back two steps on win.
#   paroli      : reverse martingale — double after a WIN, reset after 3 wins
#                 or after any loss (a "let it ride" system).
# Labouchère is handled separately (variable-length line per player).
# ----------------------------------------------------------------------------
def simulate_vectorised(strategy, w, n_players, bankroll0, base, table_max,
                        target, max_spins, seed):
    rng = np.random.default_rng(seed)
    p_win, p_half = w["p_win"], w["p_half"]
    p_lose = 1.0 - p_win - p_half

    bank = np.full(n_players, float(bankroll0))
    bet = np.full(n_players, float(base))
    active = np.ones(n_players, dtype=bool)
    wagered = np.zeros(n_players)            # total amount put at risk
    # strategy-specific state
    dlevel = np.zeros(n_players, dtype=np.int64)     # d'Alembert / generic step
    fib_pos = np.zeros(n_players, dtype=np.int64)    # fibonacci index
    paroli_streak = np.zeros(n_players, dtype=np.int64)

    # precompute fibonacci ladder long enough to hit table cap
    fib = [1, 1]
    while fib[-1] * base < table_max * 4:
        fib.append(fib[-1] + fib[-2])
    fib = np.array(fib, dtype=np.float64)

    def desired_bet():
        if strategy == "flat":
            return np.full(n_players, float(base))
        if strategy in ("martingale", "grand_mart", "paroli"):
            return bet.copy()
        if strategy == "dalembert":
            return base + dlevel.astype(float) * base
        if strategy == "fibonacci":
            idx = np.clip(fib_pos, 0, len(fib) - 1)
            return fib[idx] * base
        raise ValueError(strategy)

    for _ in range(max_spins):
        if not active.any():
            break
        want = desired_bet()
        # clamp to table max, then to what the player can afford
        want = np.minimum(want, table_max)
        # a player can only bet if they can cover the (clamped) stake
        can_bet = active & (bank >= want) & (want >= base - 1e-9)
        active = active & can_bet            # those who can't cover are done (ruin)
        if not active.any():
            break

        stake = want * active
        u = rng.random(n_players)
        win = active & (u < p_win)
        half = active & (u >= p_win) & (u < p_win + p_half)
        lose = active & (u >= p_win + p_half)

        wagered += stake
        bank = bank + win * stake - lose * stake - half * (stake * 0.5)

        # ---- update per-strategy state on active players ----
        if strategy == "martingale":
            bet = np.where(win, base, bet * 2)
            bet = np.where(half, base, bet)  # treat half-loss like a reset
        elif strategy == "grand_mart":
            bet = np.where(win, base, bet * 2 + base)
            bet = np.where(half, base, bet)
        elif strategy == "dalembert":
            dlevel = np.where(win, np.maximum(dlevel - 1, 0), dlevel + 1)
            dlevel = np.where(half, np.maximum(dlevel - 1, 0), dlevel)
        elif strategy == "fibonacci":
            fib_pos = np.where(win, np.maximum(fib_pos - 2, 0), fib_pos + 1)
            fib_pos = np.where(half, np.maximum(fib_pos - 2, 0), fib_pos)
        elif strategy == "paroli":
            paroli_streak = np.where(win, paroli_streak + 1, 0)
            new_bet = np.where(win, bet * 2, base)
            # cash out after 3 straight wins -> reset
            reset = win & (paroli_streak >= 3)
            new_bet = np.where(reset, base, new_bet)
            paroli_streak = np.where(reset, 0, paroli_streak)
            new_bet = np.where(half, base, new_bet)
            bet = new_bet

        # ---- check stop conditions ----
        reached = active & (bank >= target)
        active = active & ~reached

    net = bank - bankroll0
    return dict(
        net=net, wagered=wagered,
        p_target=np.mean(bank >= target),
        p_profit=np.mean(net > 0),
        p_ruin=np.mean(net <= -bankroll0 * 0.999),  # lost ~everything
        mean_net=net.mean(), median_net=np.median(net),
        std_net=net.std(), mean_wagered=wagered.mean(),
    )


def simulate_labouchere(w, n_players, bankroll0, base, table_max,
                        target, max_spins, seed):
    """Variable-length line per player -> explicit loop (fewer players)."""
    rng = np.random.default_rng(seed)
    p_win, p_half = w["p_win"], w["p_half"]
    nets = np.empty(n_players)
    wagered_all = np.empty(n_players)
    target_hits = 0
    for i in range(n_players):
        bank = float(bankroll0)
        line = [1, 1, 1, 1]            # base "1-1-1-1" line
        wagered = 0.0
        for _ in range(max_spins):
            if bank >= target:
                break
            if len(line) == 1:
                stake = line[0] * base
            elif len(line) == 0:
                line = [1, 1, 1, 1]
                stake = (line[0] + line[-1]) * base
            else:
                stake = (line[0] + line[-1]) * base
            stake = min(stake, table_max)
            if bank < stake or stake < base - 1e-9:
                break                  # cannot cover -> ruin/stop
            u = rng.random()
            wagered += stake
            if u < p_win:              # win -> remove ends
                bank += stake
                if len(line) <= 2:
                    line = []
                else:
                    line = line[1:-1]
                if not line:
                    line = [1, 1, 1, 1]
            elif u < p_win + p_half:   # half loss -> treat as push-ish, no append
                bank -= stake * 0.5
            else:                      # loss -> append the staked amount (in units)
                bank -= stake
                line.append(int(round(stake / base)))
        nets[i] = bank - bankroll0
        wagered_all[i] = wagered
        if bank >= target:
            target_hits += 1
    net = nets
    return dict(
        net=net, wagered=wagered_all,
        p_target=target_hits / n_players,
        p_profit=np.mean(net > 0),
        p_ruin=np.mean(net <= -bankroll0 * 0.999),
        mean_net=net.mean(), median_net=np.median(net),
        std_net=net.std(), mean_wagered=wagered_all.mean(),
    )


def part_b(seed=7):
    # realistic-ish session: €1 unit, €500 bankroll, even-money table max €100,
    # goal = double the bankroll (€1000), give up after 500 spins.
    BANKROLL, BASE, TABLE_MAX = 500, 1, 100
    TARGET, MAX_SPINS = 1000, 500
    N = 60_000
    N_LABOU = 20_000

    strategies = ["flat", "martingale", "grand_mart",
                  "dalembert", "fibonacci", "paroli"]

    print("=" * 96)
    print("PART B — STRATEGY SESSIONS  (real bankroll, table limits, target & ruin)")
    print(f"         bankroll=€{BANKROLL}  unit=€{BASE}  table_max=€{TABLE_MAX}  "
          f"target=€{TARGET}  max_spins={MAX_SPINS}")
    print(f"         {N:,} players/strategy ({N_LABOU:,} for Labouchère)")
    print("=" * 96)

    for wname in ["European (single 0)", "French (la partage)"]:
        w = WHEELS[wname]
        print(f"\n### Wheel: {wname}   (theoretical edge "
              f"{theoretical_edge(w)*100:.4f}%)")
        hdr = (f"{'strategy':<13}{'P(reach':>9}{'P(end':>8}{'P(lose':>8}"
               f"{'mean net':>11}{'median':>9}{'std':>9}{'avg':>11}{'realised':>10}")
        print(hdr)
        print(f"{'':13}{'€1000)':>9}{'+)':>8}{'all)':>8}{'(€)':>11}{'(€)':>9}"
              f"{'(€)':>9}{'wagered':>11}{'edge':>10}")
        print("-" * 96)
        for s in strategies:
            r = simulate_vectorised(s, w, N, BANKROLL, BASE, TABLE_MAX,
                                    TARGET, MAX_SPINS, seed)
            realised = -r["mean_net"] / r["mean_wagered"] if r["mean_wagered"] else 0
            print(f"{s:<13}{r['p_target']*100:>8.2f}%{r['p_profit']*100:>7.2f}%"
                  f"{r['p_ruin']*100:>7.2f}%{r['mean_net']:>11.2f}"
                  f"{r['median_net']:>9.1f}{r['std_net']:>9.1f}"
                  f"{r['mean_wagered']:>11.0f}{realised*100:>9.3f}%")
        # Labouchère
        r = simulate_labouchere(w, N_LABOU, BANKROLL, BASE, TABLE_MAX,
                                TARGET, MAX_SPINS, seed)
        realised = -r["mean_net"] / r["mean_wagered"] if r["mean_wagered"] else 0
        print(f"{'labouchere':<13}{r['p_target']*100:>8.2f}%{r['p_profit']*100:>7.2f}%"
              f"{r['p_ruin']*100:>7.2f}%{r['mean_net']:>11.2f}"
              f"{r['median_net']:>9.1f}{r['std_net']:>9.1f}"
              f"{r['mean_wagered']:>11.0f}{realised*100:>9.3f}%")
        print("-" * 96)
    print("\nKey columns:")
    print("  P(reach €1000)  chance the system hits the double-up target before quitting")
    print("  P(end +)        chance you walk away in profit at session end")
    print("  P(lose all)     chance the bankroll is wiped out")
    print("  realised edge   -mean_net / avg_wagered  ->  converges to the wheel's")
    print("                  theoretical house edge for EVERY system. That is the proof:")
    print("                  systems reshape the WIN/LOSS shape, never the average.\n")


if __name__ == "__main__":
    part_a()
    part_b()
