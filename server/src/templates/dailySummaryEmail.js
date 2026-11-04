/**
 * DAILY SUMMARY EMAIL HTML TEMPLATE - Phase 6
 *
 * Professional, clean student budget email template.
 * ZERO EMOJIS.
 */

export function renderDailySummaryHtml({
  userName,
  targetDate,
  monthName,
  daily,
  monthly,
}) {
  const overspentWarning = daily.savingsDeduction > 0
    ? `
      <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <strong style="color: #991b1b; font-size: 14px;">Warning: Reserve Wallet Depleted</strong>
        <p style="color: #b91c1c; font-size: 13px; margin: 4px 0 0 0;">
          Your Reserve Wallet has reached INR 0. Overspending today has deducted INR ${daily.savingsDeduction} from your Projected Savings.
        </p>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PiggyPocket Daily Budget Summary</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5, #4338ca); padding: 28px 24px; color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #c7d2fe; margin-bottom: 4px;">
                      Daily Financial Summary
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">
                      PiggyPocket Daily Report
                    </h1>
                    <div style="font-size: 13px; color: #e0e7ff; margin-top: 4px;">
                      ${targetDate} • Hello, ${userName}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 24px;">

              ${overspentWarning}

              <!-- SECTION 1: DAILY SPENDING SUMMARY -->
              <div style="margin-bottom: 24px;">
                <h2 style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 0 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                  1. Daily Spending Summary (${targetDate})
                </h2>

                <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 13px; border-collapse: collapse;">
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Daily Spending Limit:</td>
                    <td align="right" style="font-weight: 700; color: #0f172a;">INR ${daily.dailyLimit}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Actual Spending Today:</td>
                    <td align="right" style="font-weight: 700; color: #0f172a;">INR ${daily.actualSpending}</td>
                  </tr>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Daily Overspending:</td>
                    <td align="right" style="font-weight: 700; color: ${daily.overspending > 0 ? '#ef4444' : '#10b981'};">
                      INR ${daily.overspending}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Used from Reserve Wallet:</td>
                    <td align="right" style="font-weight: 700; color: #0284c7;">INR ${daily.reserveUsed}</td>
                  </tr>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Deducted from Savings:</td>
                    <td align="right" style="font-weight: 700; color: ${daily.savingsDeduction > 0 ? '#ef4444' : '#10b981'};">
                      INR ${daily.savingsDeduction}
                    </td>
                  </tr>
                  <tr style="background-color: #f0f9ff; border-bottom: 2px solid #bae6fd;">
                    <td style="color: #0369a1; font-weight: 700;">Remaining Reserve Wallet Balance:</td>
                    <td align="right" style="font-weight: 800; font-size: 15px; color: #0284c7;">
                      INR ${daily.newReserve}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- SECTION 2: MONTHLY FINANCIAL SUMMARY -->
              <div style="margin-bottom: 24px;">
                <h2 style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 0 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                  2. Monthly Financial Summary (${monthName})
                </h2>

                <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 13px; border-collapse: collapse;">
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Monthly Pocket Money:</td>
                    <td align="right" style="font-weight: 700; color: #0f172a;">INR ${monthly.pocketMoney}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Original Savings Goal:</td>
                    <td align="right" style="font-weight: 700; color: #059669;">INR ${monthly.originalSavingsGoal}</td>
                  </tr>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Total Spending to Date:</td>
                    <td align="right" style="font-weight: 700; color: #0f172a;">INR ${monthly.totalSpent}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Remaining Spending Budget:</td>
                    <td align="right" style="font-weight: 700; color: ${monthly.remainingSpendingBudget < 0 ? '#ef4444' : '#0f172a'};">
                      INR ${monthly.remainingSpendingBudget}
                    </td>
                  </tr>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Reserve Wallet Balance:</td>
                    <td align="right" style="font-weight: 700; color: #0284c7;">INR ${monthly.currentReserveBalance}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Cumulative Reserve Used:</td>
                    <td align="right" style="font-weight: 700; color: #0284c7;">INR ${monthly.reserveUsed}</td>
                  </tr>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; font-weight: 600;">Cumulative Savings Deductions:</td>
                    <td align="right" style="font-weight: 700; color: ${monthly.cumulativeSavingsDeductions > 0 ? '#ef4444' : '#10b981'};">
                      INR ${monthly.cumulativeSavingsDeductions}
                    </td>
                  </tr>
                  <tr style="background-color: #ecfdf5; border-bottom: 2px solid #a7f3d0;">
                    <td style="color: #047857; font-weight: 700;">Adjusted Projected Savings:</td>
                    <td align="right" style="font-weight: 800; font-size: 15px; color: #059669;">
                      INR ${monthly.adjustedProjectedSavings}
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 10px; font-size: 11px; color: #047857; background: #ecfdf5; padding: 8px 12px; border-radius: 4px; border: 1px dashed #a7f3d0;">
                  * Note: Adjusted Projected Savings is a PROJECTION, not a real bank balance. Original goal is permanently preserved.
                </div>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="http://localhost:3000/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                      Open PiggyPocket Dashboard
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              You received this daily summary because daily email summaries are enabled in your PiggyPocket settings.<br>
              To change delivery time or unsubscribe, visit your PiggyPocket Settings.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
