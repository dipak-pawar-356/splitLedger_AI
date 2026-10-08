---
phase: 2
plan: 2
wave: 2
gap_closure: false
---

# Plan 2.2: Group-Isolated Dynamic Settlement Calculation & Integrity Endpoint

## Objective
Implement server actions in `src/actions/upi-settlements.ts` or `src/actions/settlements.ts` to compute real-time group-isolated debts, fetch receiver UPI IDs from the database, perform backend authorization checks, and provide an on-demand verified QR code generator endpoint that enforces data freshness and payment integrity.

## Context
- `src/actions/settlements.ts`
- `src/actions/group-financials.ts`
- `src/lib/payments/upi.ts`
- `src/lib/db/schema/schema.ts`

## Tasks

<task type="auto">
  <name>Implement Group UPI Settlement Engine</name>
  <files>
    src/actions/upi-settlements.ts
  </files>
  <action>
    1. Create `getGroupUpiSettlementsAction(groupIdOrPublicId)`:
       - Require auth and verify group membership.
       - Calculate net balances strictly for this group (group isolation guarantee).
       - Determine debts the caller owes (`myPayables`: receiver user ID, receiver name, receiver avatar, receiver upiId, amount).
       - Determine debts owed to the caller (`myReceivables`: debtor user ID, debtor name, debtor avatar, amount).
       - Verify receiver UPI ID validity. If receiver lacks a valid UPI ID, flag `hasValidUpi: false` and include prompt message.
       - Generate dynamic QR and deep links for each payable.
    2. Create `verifyAndGenerateSettlementQrAction({ groupId, toUserId })`:
       - Fresh database lookup immediately before QR display.
       - Recalculate exact current pending debt amount.
       - Fail gracefully if debt <= 0 or already paid or receiver has no valid UPI ID.
       - Return verified fresh QR code, upiUri, and amount.
  </action>
  <verify>
    npx tsc --noEmit
  </verify>
  <done>
    Backend acts as single source of truth; fresh amounts and verified receiver UPI IDs returned.
  </done>
</task>
