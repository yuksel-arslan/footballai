# Match Analysis Parameters — Design & Roadmap

> Goal: analysis must **produce accuracy, not words**. Every behaviour that
> measurably changes a match outcome should be a model input. This document is
> the prioritised parameter taxonomy and the architecture to consume it.

## Current state (baseline)

`services/ml-service/app/services/feature_engineering.py` produces **21
team-level aggregate features** only:

- Form score (home/away, weighted last 5)
- Attack / defense strength
- Goals & conceded per game
- Clean sheet rate
- League position diff, points
- H2H home-win / draw rate
- Win rate (overall + home/away split)
- Competition motivation

There is **no** player-, position-, style-, or in-play signal. Everything in
sections 1–5 below is missing and is what turns generic guessing into accurate
analysis.

Legend: ✓ exists · ✗ missing (to add) · ⚠ requires extra data source

---

## 1. Squad & Formation (the "right-winger on the left" case)

- ✗⚠ Natural position vs fielded position mismatch (right wing → played left = wrong-foot effect)
- ✗⚠ Number of wrong-footed players (right-footed on left / left-footed on right)
- ✗⚠ Formation type (4-3-3, 3-5-2…) and in-match formation change
- ✗⚠ Formation matchup / counter (e.g. back-3 vs 2 strikers)
- ✗⚠ Similarity of XI to ideal/strongest XI (rotation degree)
- ✗⚠ Share of new-transfer / low-integration players
- ✗⚠ Player's matches played in that exact position (familiarity)

## 2. Player Quality & Availability

- ✗⚠ Injured / suspended key players (striker, playmaker, keeper especially)
- ✗⚠ Contribution weight of missing players (their xG/xA share)
- ✗⚠ Squad market value / star density
- ✗⚠ Goalkeeper quality (save %, PSxG–GA)
- ✗⚠ Fatigue: days since last match, minutes played

## 3. Tactics & Playing Style

- ✗⚠ Possession % and style (possession vs counter)
- ✗⚠ Press intensity (PPDA), defensive line height
- ✗⚠ Attack-side preference (left/right/central distribution)
- ✗⚠ Set-piece effectiveness (corner / free-kick goal rate)
- ✗⚠ Style clash baseline (high press vs long ball, etc.)

### 3b. Reciprocal Style Prediction & Interaction

Static style is not enough — teams **adapt** to the opponent. Need to predict
the style each team will *choose this match*, then clash the two.

**Step 1 — predict the style each team adopts in THIS match (contextual):**
- ✗⚠ Expected possession balance (power gap + home/away → who holds the ball)
- ✗⚠ Expected block height (favourite high press / underdog low block tendency)
- ✗⚠ Expected tempo (counter vs build-up)
- ✗⚠ Game-state scenario (style shift when leading / trailing)
- ✗⚠ Style chosen historically vs **similar-strength / similar-style** opponents (strongest signal)

**Step 2 — clash the two styles (matchup matrix):**
- ✗⚠ High press ↔ long ball / fast build-up → press-breaker advantaged
- ✗⚠ Possession ↔ low block + counter → "give the ball, close the space"
- ✗⚠ Wing-heavy attack ↔ narrow defense / weak full-back matchup
- ✗⚠ Set-piece strength ↔ opponent aerial weakness
- ✗⚠ Tempo match (two fast teams → many goals; two cautious → few)

**Modelling:** reduce each team to a **style vector** (possession, press,
tempo, wing bias, directness…) learned from past event data. Feed the match
model **interaction terms** (products/diffs of the two vectors) — XGBoost
captures the interactions; Poisson receives a style-adjusted expected-goals λ.
A small **two-stage** model predicts "style they will choose" → feeds the main
model.

## 4. Advanced Performance Metrics (quality, not just result)

- ✗⚠ xG / xGA (far more predictive than form)
- ✗⚠ xG-difference trend (separates lucky from earned wins)
- ✗⚠ Shots, shots on target, in-box shot share
- ✗⚠ Big-chance creation / misses

### 4b. Half-Time Update Model (45-min snapshot) — highest accuracy point

At half-time most uncertainty is resolved: the style is now **observed**, the
remaining-time expectation is clearer, and subs (made + likely) are known. This
is a **second model** layered on the pre-match prediction, using measured
first-half data, not guesses.

**Observed style (now certain):**
- First-half possession %, PPDA, block height, tempo — measured, not predicted
- Realised wing distribution, directness, set-piece count

**Performance vs expectation (lucky/unlucky split):**
- First-half xG vs actual score (1-0 but xG 0.3–1.2 → likely to swing — strongest signal)
- Big chances, shots on target, box entries

**Game state & expected behaviour:**
- Current score → leader drops / chaser takes risk profile
- Team's historical second-half behaviour at this score state
- Remaining expected goals (λ recomputed from score + style)

**Squad dynamics (now known/foreseeable):**
- Half-time substitutions made + their effect
- Remaining sub slots; fatigued / yellow-carded at-risk players
- Likely second-half moves (attacking/defensive)

**Context:**
- Numeric/tactical disadvantage from injury or early red card
- First-half referee tendency (card count)

**Modelling:** treat the second half as a separate Poisson process — recompute
λ from observed first-half xG + game state + style. Give XGBoost a "first-half
snapshot" feature set. Outputs: updated FT score, remaining-time goal
probabilities, live 1X2. Infrastructure exists: `LiveScore` model +
`services/match-service/src/services/websocket.ts`.

## 5. Context & Environment

- ✓ Competition motivation (`competition_motivation`)
- ✗⚠ Match importance (relegation / title / European race)
- ✗⚠ Fixture congestion / post-European-game match
- ✗⚠ Travel distance, away difficulty
- ✗⚠ Weather, pitch surface
- ✗⚠ Referee profile (card / penalty tendency)
- ✗⚠ Derby / rivalry factor

## 6. Form & Momentum (partial, weak today)

- ✓ Weighted last-5 form score
- ✗ Opponent-strength-adjusted form (5 wins vs weak ≠ vs strong)
- ✗ First-half / second-half goal distribution (late-goal tendency)
- ✗ Behaviour when leading / trailing (score-state profile)

## 7. Manager & Bench (the human factor)

- ✗⚠ Manager-vs-manager H2H record (tactical edge / bogey-coach effect)
- ✗⚠ In-game management quality: substitution timing & impact history
- ✗⚠ Tactical flexibility (does he adapt mid-game or stay rigid?)
- ✗⚠ New-manager bounce (first matches after appointment over-perform)
- ✗⚠ Manager-under-pressure / caretaker situation
- ✗⚠ Bench quality / impact-sub availability (game-changers off the bench)
- ✗⚠ Squad depth across competitions (rotation capacity)

## 8. Individual Duels & Matchups (won/lost in 1v1s)

A coach reads matches as a set of duels, not team averages.

- ✗⚠ Pace mismatch: fast forwards vs slow center-backs (high-line exploit — huge)
- ✗⚠ Aerial mismatch: tall striker vs short defender (and reverse)
- ✗⚠ Full-back vs winger 1v1 quality (the flank that breaks first)
- ✗⚠ Press-resistance of deepest midfielder/CBs vs opponent press
- ✗⚠ Playmaker vs his marker / screening holding-mid (is the #10 free?)
- ✗⚠ Key-player marking scheme (man-marking, doubling the danger man)
- ✗⚠ Striker hot/cold streak specifically (not just team form)
- ✗⚠ Penalty-taker quality & record (decisive in tight games)

## 9. Phases of Play & Transitions

- ✗⚠ Build-up from the back vulnerability (pressed into errors)
- ✗⚠ Pressing triggers & how they are beaten
- ✗⚠ Transition speed: counter-attack directness & numbers committed
- ✗⚠ Rest defense / counter-press quality (exposure when attacking)
- ✗⚠ Turnover zones (where they lose the ball → opponent danger)
- ✗⚠ Offside trap / high-line usage vs opponent runner pace
- ✗⚠ GK distribution style (short build-up vs long) & sweeper-keeper role

## 10. Set Pieces (detailed — often the margin)

- ✗⚠ Set-piece personnel: aerial threats present in the XI today
- ✗⚠ Delivery quality (specialist taker on the pitch?)
- ✗⚠ Marking scheme (zonal vs man) and its historical leakage
- ✗⚠ Long-throw specialist availability
- ✗⚠ Penalties/free-kicks won & conceded tendency

## 11. Psychology & Motivation

- ✗⚠ Motivation asymmetry: dead-rubber vs must-win (mid-table vs relegation-fight)
- ✗⚠ Confidence state after a big win / heavy loss
- ✗⚠ Bogey-team / psychological H2H edge
- ✗⚠ Home fortress factor vs hostile-away record
- ✗⚠ Crowd/atmosphere & expectation pressure (favourite choking risk)
- ✗⚠ Contract/transfer-saga distractions among key players

## 12. Discipline & Game Management

- ✗⚠ Tactical-foul tendency (breaks up opponent transitions)
- ✗⚠ Card accumulation / suspension-risk players (cautious play)
- ✗⚠ Game-killing ability when leading (time-wasting, shape, fouls)
- ✗⚠ Concentration-lapse windows (goals conceded in 0–15 / 75–90)
- ✗⚠ Shape discipline when tired (late-game collapse risk)

## 13. Calendar & Physical Context

- ✗⚠ Return from international break (key players traveled far / played)
- ✗⚠ Two-legged tie context (aggregate score, first-leg result, who needs goals)
- ✗⚠ Kick-off time (day/night, body-clock for travelers)
- ✗⚠ Altitude / extreme venue conditions
- ✗⚠ Pitch dimensions (some grounds notably small/large → style impact)
- ✗⚠ Training load / point in season (fitness peak vs burnout)

---

## Data sourcing reality

Sections 1–4 need **player-level lineup + event data** (xG, PPDA, possession,
pass direction, block height). The current providers (football-data.org) do not
supply this. Required additions:

- **API-Football** — lineups, player positions, match statistics (possession, shots), injuries
- **Understat / FBref (StatsBomb)** — xG, xGA, advanced event metrics

So this is not only a modelling problem — it is a **data acquisition** problem.

## Implementation phases

1. **Quick win** — add API-Football style proxies (possession %, shot profile,
   xG, injuries, fixture congestion). 21 → ~40 features. No architecture change.
2. **Style vectors & interaction** — build per-team style vectors + two-stage
   "style this match" predictor; add interaction features (§3b).
3. **Half-time update model** — second model on the 45-min snapshot (§4b),
   wired to existing live infrastructure.
4. **Full positional depth** — event-data integration for the squad/formation
   signals in §1 (the right-winger-on-the-left case).

Priority order by accuracy-per-effort: **1 → 4b/§3b → 2 → 1(positional)**.
xG and the half-time snapshot give the biggest accuracy jump for the least work.
