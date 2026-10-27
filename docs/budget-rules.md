# Smart Budget Tracker: Budget Engine Formulas & Specification

This document details the mathematical rules, formulas, edge cases, and worked examples implemented in the pure TypeScript module `@smart-budget-tracker/shared/budget-engine`.

---

## 1. Core Principles

1. **Integer Paise Only**: All money values are strictly positive or zero integers representing paise (1 INR = 100 paise). Float arithmetic is strictly prohibited to eliminate precision loss.
2. **Pure Derivation**: No running or stored totals. Every metric (spent, remaining, cumulative overspend, adjusted savings, recommended daily limits) is derived purely on each evaluation from the budget inputs and transactions. Edits, deletions, and duplicate entries are always deterministic and safe.
3. **Savings Projection, Not Bank Transfer**: The user's original savings goal is an aspirational projection. Daily overspends dynamically reduce the *projected* savings, never rewriting the original goal or performing actual money transfers.
4. **Local Calendar Month**: Transactions are assigned to days and months based on their date in the user's local timezone (default: `Asia/Kolkata`).

---

## 2. Mathematical Definitions & Formulas

### 2.1 Spending Budget
$$\text{spendingBudget} = \text{pocketMoney} - \text{originalSavingsGoal}$$
- $\text{originalSavingsGoal} \le \text{pocketMoney}$
- Rejects negative values or non-integer paise.

### 2.2 Period Days & Auto Daily Limit
- $\text{periodDays} = \text{lastDayOfMonth} - \text{receivedOnDay} + 1$
- $\text{baseDailyLimit} = \lfloor \text{spendingBudget} / \text{periodDays} \rfloor$
- $\text{leftoverPaise} = \text{spendingBudget} \pmod{\text{periodDays}}$
- **Leftover Paise Distribution**: The first $\text{leftoverPaise}$ days of the period receive $\text{baseDailyLimit} + 1$, and all subsequent days receive $\text{baseDailyLimit}$. The sum of daily limits across the period equals $\text{spendingBudget}$ to the exact single paisa.

### 2.3 Effective Daily Limits
$$\text{limitForDay}(d) = \begin{cases} 0 & \text{if } d < \text{receivedOn} \\ \text{latestCustomLimit}(effectiveFrom \le d) & \text{if custom limit exists} \\ \text{autoDailyLimit}(d) & \text{otherwise} \end{cases}$$
Changing a daily limit effective on day $k$ never modifies limits for days $< k$.

### 2.4 Daily Spending, Overspend, and Remaining
$$\text{dailySpent}(d) = \sum_{t \in \text{Transactions}(d), \text{deletedAt is null}} \text{amountPaise}(t)$$

$$\text{dailyOverspend}(d) = \begin{cases} 0 & \text{if } d < \text{receivedOn} \\ \max(0, \text{dailySpent}(d) - \text{limitForDay}(d)) & \text{otherwise} \end{cases}$$

$$\text{dailyRemaining}(d) = \begin{cases} 0 & \text{if } d < \text{receivedOn} \\ \max(0, \text{limitForDay}(d) - \text{dailySpent}(d)) & \text{otherwise} \end{cases}$$

### 2.5 Cumulative Overspend & Adjusted Projected Savings
$$\text{cumulativeOverspend}(\text{asOfDate}) = \sum_{d = \text{receivedOn}}^{\text{asOfDate}} \text{dailyOverspend}(d)$$

$$\text{adjustedProjectedSavings} = \text{originalSavingsGoal} - \text{cumulativeOverspend}(\text{asOfDate})$$
- Note: $\text{adjustedProjectedSavings}$ can reach zero or negative numbers. It is **never clamped** to zero. Negative numbers indicate the user has cut into their baseline savings goal.

### 2.6 Total Spent & Remaining Monthly Budget
$$\text{totalSpent} = \sum_{d \in \text{Month}} \text{dailySpent}(d)$$

$$\text{remainingMonthlyBudget} = \text{spendingBudget} - \text{totalSpent}$$

$$\text{monthlyBudgetExceeded} = \text{remainingMonthlyBudget} < 0$$

### 2.7 Recommended Daily Limit
$$\text{recommendedDailyLimit} = \begin{cases} 0 & \text{if } \text{remainingDays} = 0 \\ \lfloor \max(0, \text{remainingMonthlyBudget}) / \text{remainingDays} \rfloor & \text{otherwise} \end{cases}$$
where $\text{remainingDays}$ includes today through the last day of the month.

### 2.8 Goal Status
- **For Current Month**:
  - `ON_TRACK`: $\text{cumulativeOverspend} = 0$
  - `REDUCED`: $\text{adjustedProjectedSavings} > 0 \land \text{cumulativeOverspend} > 0$
  - `AT_RISK_OR_LOST`: $\text{adjustedProjectedSavings} \le 0$
- **For Finished Month**:
  - `ACHIEVED`: $\text{cumulativeOverspend} = 0$
  - `PARTIAL`: $\text{adjustedProjectedSavings} > 0 \land \text{cumulativeOverspend} > 0$
  - `MISSED`: $\text{adjustedProjectedSavings} \le 0$

---

## 3. Worked Test Scenarios

### Case A: Baseline Month Setup
- Pocket Money: ₹5,000 (500,000 paise)
- Original Savings Goal: ₹1,000 (100,000 paise)
- **Spending Budget**: ₹4,000 (400,000 paise)
- Projected Savings: ₹1,000 (`ON_TRACK`)

### Case B: Single Day Overspend
- Daily Limit: ₹100 (10,000 paise)
- Amount Spent: ₹120 (12,000 paise)
- **Overspend**: ₹20 (2,000 paise)
- **Adjusted Projected Savings**: ₹1,000 - ₹20 = ₹980 (98,000 paise)
- Original Goal: Unchanged at ₹1,000 (`REDUCED`)

### Case C: Cumulative Overspend Over Multiple Days
- Daily Limit: ₹100
- Day 1: Spent ₹120 $\rightarrow$ Overspend ₹20, Cumulative: ₹20, Adjusted: ₹980
- Day 2: Spent ₹130 $\rightarrow$ Overspend ₹30, Cumulative: ₹50, Adjusted: ₹950
- Day 3: Spent ₹110 $\rightarrow$ Overspend ₹10, Cumulative: ₹60, Adjusted: ₹940

### Case D: Under-budget Day
- Daily Limit: ₹100
- Amount Spent: ₹75
- **Remaining for Day**: ₹25
- **Overspend**: ₹0
- Cumulative Overspend: Unchanged
- Adjusted Projected Savings: Unchanged

### Case E: Mid-Month Limit Revision
- Effective from Day 1: Limit = ₹100/day
- Effective from Day 15: Limit changed to ₹150/day
- Day 10 (Spent ₹120): Evaluated against ₹100 limit $\rightarrow$ ₹20 overspend
- Day 16 (Spent ₹120): Evaluated against ₹150 limit $\rightarrow$ ₹0 overspend, ₹30 remaining

### Case F: Integer Remainder Distribution
- Spending Budget: ₹4,000 (400,000 paise) over 30 days (April)
- $400,000 / 30 = 13,333$ with remainder $10$
- Days 1 to 10: ₹133.34 each (13,334 paise)
- Days 11 to 30: ₹133.33 each (13,333 paise)
- **Sum across 30 days**: $(10 \times 13,334) + (20 \times 13,333) = 133,340 + 266,660 = 400,000$ paise (₹4,000.00 exact).
