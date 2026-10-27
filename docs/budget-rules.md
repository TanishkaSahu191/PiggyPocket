# Smart Budget Tracker: Budget Engine Formulas & Specification (Phase 2)

This document details the exact mathematical rules, formulas, edge cases, and worked examples implemented in the pure TypeScript module `@smart-budget-tracker/shared/budget-engine`.

---

## 1. Core Principles

1. **Integer Paise Only**: All money values are strictly positive or zero integers representing paise (1 INR = 100 paise). Float arithmetic is strictly prohibited to eliminate precision loss.
2. **Pure Derivation**: No running or stored totals. Every metric (spent, remaining, reservoir, cumulative shortfall, projected savings, recommended daily limits) is derived purely on each evaluation from the budget inputs and transactions. Edits, deletions, and duplicate entries are always deterministic and safe.
3. **Savings Projection, Not Bank Transfer**: The user's original savings goal is protected and never changes. Daily shortfalls (overspends not covered by the reservoir) dynamically reduce the *projected* savings, never rewriting the original goal or performing actual money transfers.
4. **Local Calendar Month**: Transactions are assigned to days and months based on their date in the user's local timezone (default: `Asia/Kolkata`).

---

## 2. Mathematical Definitions & Formulas

### 2.1 Spending Budget
$$\text{spendingBudget} = \text{pocketMoney} - \text{originalSavingsGoal}$$
- $\text{originalSavingsGoal} \le \text{pocketMoney}$
- Rejects negative values, non-integer paise, or goals exceeding pocket money.

### 2.2 Period Days & Auto Daily Limit
- $\text{periodDays} = \text{lastDayOfMonth} - \text{receivedOnDay} + 1$
- $\text{baseDailyLimit} = \lfloor \text{spendingBudget} / \text{periodDays} \rfloor$
- $\text{leftoverPaise} = \text{spendingBudget} \pmod{\text{periodDays}}$
- **Leftover Paise Distribution**: The first $\text{leftoverPaise}$ days of the period receive $\text{baseDailyLimit} + 1$, and all subsequent days receive $\text{baseDailyLimit}$. The sum of daily limits across the period equals $\text{spendingBudget}$ to the exact single paisa.

### 2.3 Effective Daily Limits
$$\text{limitForDay}(d) = \begin{cases} 0 & \text{if } d < \text{receivedOn} \\ \text{latestCustomLimit}(effectiveFrom \le d) & \text{if custom limit exists} \\ \text{autoDailyLimit}(d) & \text{otherwise} \end{cases}$$
Changing a daily limit effective on day $k$ never modifies limits for days $< k$.

### 2.4 Daily Spending
$$\text{dailySpent}(d) = \sum_{t \in \text{Transactions}(d), \text{deletedAt is null}} \text{amountPaise}(t)$$
Days before `receivedOn` have no limit, no reservoir effect, and no shortfall, but their spending still counts toward $\text{totalSpent}$.

### 2.5 The Reservoir Algorithm
Processed day by day in date order from `receivedOn`:
$$\text{dailyOverspend}(d) = \max(0, \text{dailySpent}(d) - \text{limitForDay}(d))$$

- **If $\text{dailySpent}(d) \le \text{limitForDay}(d)$**:
  $$\text{banked}(d) = \text{limitForDay}(d) - \text{dailySpent}(d)$$
  $$\text{reservoir} \leftarrow \text{reservoir} + \text{banked}(d)$$
  $$\text{reservoirUsed}(d) = 0$$
  $$\text{shortfall}(d) = 0$$

- **Otherwise ($\text{dailySpent}(d) > \text{limitForDay}(d)$)**:
  $$\text{excess}(d) = \text{dailySpent}(d) - \text{limitForDay}(d)$$
  $$\text{covered}(d) = \min(\text{excess}(d), \text{reservoir})$$
  $$\text{reservoir} \leftarrow \text{reservoir} - \text{covered}(d)$$
  $$\text{reservoirUsed}(d) = \text{covered}(d)$$
  $$\text{banked}(d) = 0$$
  $$\text{shortfall}(d) = \text{excess}(d) - \text{covered}(d)$$

- The reservoir **never goes negative**.
- Today counts provisionally as if it ended now (labeled with `isTodayProvisionally`).
- The reservoir resets each month. Leftover reservoir at month end is reported as `unspentReservoirPaise` ('unspent budget') and is **not** added to savings automatically.

### 2.6 Cumulative Shortfall & Projected Savings
$$\text{cumulativeShortfall}(\text{asOfDate}) = \sum_{d = \text{receivedOn}}^{\text{asOfDate}} \text{shortfall}(d)$$

$$\text{protectedSavings} = \text{originalSavingsGoal} \quad \text{(constant)}$$

$$\text{projectedSavings} = \text{originalSavingsGoal} - \text{cumulativeShortfall}(\text{asOfDate})$$
- Note: $\text{projectedSavings}$ may reach zero or go negative. It is **never clamped**. Negative numbers indicate the user has exceeded their pocket money budget.

### 2.7 Daily Available Spending & Unallocated Budget
$$\text{todayRemainingAllowance} = \max(0, \text{limitForDay}(\text{today}) - \text{dailySpent}(\text{today}))$$

$$\text{availableToSpendToday} = \text{todayRemainingAllowance} + \text{reservoirFromEarlierDays}$$

$$\text{unallocatedBudget} = \text{spendingBudget} - \sum_{d = \text{receivedOn}}^{\text{lastDayOfMonth}} \text{limitForDay}(d)$$
- If $\sum \text{limits} > \text{spendingBudget}$, `limitsExceedSpendingBudget` is flagged as `true` to warn the user during setup.

### 2.8 Recommended Daily Limit
$$\text{recommendedDailyLimit} = \begin{cases} 0 & \text{if } \text{remainingDays} = 0 \\ \lfloor \max(0, \text{remainingMonthlyBudget}) / \text{remainingDays} \rfloor & \text{otherwise} \end{cases}$$
where $\text{remainingDays}$ includes today through the last day of the month. It is separate from the original daily limit and named differently.

### 2.9 Goal Status
- **For Current Month**:
  - `ON_TRACK`: $\text{cumulativeShortfall} = 0$
  - `REDUCED`: $\text{projectedSavings} > 0 \land \text{cumulativeShortfall} > 0$
  - `AT_RISK_OR_LOST`: $\text{projectedSavings} \le 0$
- **For Finished Month**:
  - `ACHIEVED`: $\text{cumulativeShortfall} = 0$
  - `PARTIAL`: $\text{projectedSavings} > 0 \land \text{cumulativeShortfall} > 0$
  - `MISSED`: $\text{projectedSavings} \le 0$
- Also flags `monthlyBudgetExceeded = remainingMonthlyBudget < 0`.

---

## 3. Worked Test Scenarios

### Case A: Baseline Month Setup
- Pocket Money: ₹5,000 (500,000 paise)
- Original Savings Goal: ₹1,000 (100,000 paise)
- **Spending Budget**: ₹4,000 (400,000 paise)
- Protected Savings: ₹1,000
- Projected Savings: ₹1,000 (`ON_TRACK`)

### Case B: Empty Reservoir Overspend
- Daily Limit: ₹100 (10,000 paise)
- Amount Spent: ₹120 (12,000 paise) with an empty reservoir
- **Shortfall**: ₹20 (2,000 paise)
- **Projected Savings**: ₹1,000 - ₹20 = ₹980 (98,000 paise)
- Protected Savings: Still ₹1,000 (`REDUCED`)

### Case C: Cumulative Shortfall Across Multiple Days
- Daily Limit: ₹100, Empty Reservoir
- Day 1: Spent ₹120 $\rightarrow$ Shortfall ₹20, Cumulative Shortfall: ₹20, Projected Savings: ₹980
- Day 2: Spent ₹130 $\rightarrow$ Shortfall ₹30, Cumulative Shortfall: ₹50, Projected Savings: ₹950
- Day 3: Spent ₹110 $\rightarrow$ Shortfall ₹10, Cumulative Shortfall: ₹60, Projected Savings: ₹940

### Case D: Under-budget Day
- Daily Limit: ₹100
- Amount Spent: ₹75
- **Banked into Reservoir**: ₹25
- **Shortfall**: ₹0
- Reservoir Balance: ₹25
- Projected Savings: Unchanged (₹1,000)

### Case E: Mid-Month Limit Revision
- Effective from Day 1: Limit = ₹100/day
- Effective from Day 15: Limit changed to ₹150/day
- Day 10 (Spent ₹120): Evaluated against ₹100 limit $\rightarrow$ ₹20 excess
- Day 16 (Spent ₹120): Evaluated against ₹150 limit $\rightarrow$ ₹0 excess, ₹30 banked

### Case R: Full Reservoir Lifecycle (Limit ₹100)
- **Day 1 (Spend ₹60)**: Under limit by ₹40 $\rightarrow$ Reservoir = ₹40. Shortfall = ₹0.
- **Day 2 (Spend ₹90)**: Under limit by ₹10 $\rightarrow$ Reservoir = ₹40 + ₹10 = ₹50. Shortfall = ₹0.
- **Day 3 (Spend ₹180)**: Excess = ₹80. Covered by reservoir = ₹50. Reservoir = ₹0. Shortfall = ₹30. Projected Savings = ₹970.
- **Day 4 (Spend ₹130)**: Excess = ₹30. Covered = ₹0. Reservoir = ₹0. Shortfall = ₹30. Cumulative Shortfall = ₹60. Projected Savings = ₹940.
- **Reservoir Properties**:
  - The reservoir is never negative.
  - Protected savings never changes.
  - Editing Day 1 from ₹60 to ₹100 recomputes everything without double counting.
  - Spending exactly the limit banks nothing and uses nothing.
  - Unallocated budget for ₹5,000 income, ₹1,000 savings, limit ₹100 over 30 days is $4000 - (30 \times 100) = ₹1,000$.

### Case I: Edit, Delete, Idempotency & Uniqueness
- Editing transaction amounts recalculates all daily and monthly projections instantaneously.
- Soft-deleting a transaction eliminates its effect from both daily spent and cumulative metrics.
- Running calculations twice on identical inputs produces identical results.
