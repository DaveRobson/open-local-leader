# CrossFit Open Leaderboard Scoring Logic

## 1. Global Ranking Strategy

* **Ranking Type:** Ordinal (Ranking-based).
* **Point System:** 1st Place = 1 point, 2nd Place = 2 points, etc.
* **Total Score:** The sum of all individual workout ranks.
* **Goal:** The **lowest** total score across all events wins the competition.

---

## 2. Logic Decision Tree

### Tier 1: Division Filter

Before any performance metrics are calculated, athletes must be partitioned by their movement standard.

1. **Rx (As Prescribed):** Ranked highest.
2. **Scaled:** Ranked below all Rx athletes.
3. **Foundations:** Ranked below all Scaled athletes.

> **Agent Rule:** `Rank_Offset = (Total_Athletes_in_Higher_Divisions)`. The best Scaled athlete’s rank is `Total_Rx_Athletes + 1`.

---

## 3. Performance Sorting by Workout Type

### Type A: AMRAP (As Many Reps As Possible)

* **Primary Metric:** Total Repetitions (Descending).
* **Secondary Metric (Tiebreaker):** Milestone Timestamp (Ascending).
* **Logic:** `SORT BY total_reps DESC, tiebreak_time ASC`

### Type B: For Time (With Time Cap)

This requires a binary check for completion:

* **Category 1: Finishers**
* `SORT BY total_time ASC`


* **Category 2: Non-Finishers (Capped)**
* Always ranked below all Finishers.
* `SORT BY total_reps DESC, tiebreak_time ASC`



### Type C: Max Lift (Strength)

* **Primary Metric:** Total Load/Weight (Descending).
* **Secondary Metric (Tiebreaker):** Successful Lift Timestamp OR Previous Workout Rank (Ascending).
* **Logic:** `SORT BY load_weight DESC, tiebreak_time ASC`

---

## 4. Tiebreaker Implementation Logic

To resolve "Dead Heats" where primary scores are identical, the AI must use a **Sub-interval Time**.

* **When to use:** When `Athlete_A.PrimaryScore == Athlete_B.PrimaryScore`.
* **The Checkpoint:** Usually the time recorded at the end of the previous round or set.
* **Winner:** The athlete with the lower `tiebreak_time`.

---

## 5. Scoring Example (The "Two-Part" Event)

If Event 1 has two scores (1A and 1B), treat them as independent data points:

| Athlete | 1A Rank (AMRAP) | 1B Rank (Max Lift) | Total Points |
| --- | --- | --- | --- |
| **Athlete X** | 2 | 10 | 12 |
| **Athlete Y** | 5 | 1 | 6 |

*Result: Athlete Y is currently winning because 6 is lower than 12.*

---

## 6. Edge Case: Missing Scores

* **Logic:** If an athlete fails to submit a score for a workout, they are assigned a rank equal to `Total_Participants + 1` for that specific event.