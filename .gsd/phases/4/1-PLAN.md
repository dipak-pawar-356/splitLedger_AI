---
phase: 4
plan: 1
wave: 1
gap_closure: false
---

# Plan 4.1: Real-Time Payment Invalidation & Settlement History

## Objective
Implement settlement recording and invalidation: when a payer marks a payment as complete (or provides UTR reference), record the settlement in database, invalidate the old QR, trigger Next.js cache revalidation (`revalidatePath`), and update group balances in real-time.

## Context
- `src/actions/upi-settlements.ts`
- `src/actions/settlements.ts`

## Tasks

<task type="auto">
  <name>Build Payment Invalidation and Revalidation Actions</name>
  <files>
    src/actions/upi-settlements.ts
  </files>
  <action>
    1. Implement `recordSettlementPaymentAction`:
       - Accepts `groupId`, `toUserId`, `amount`, `paymentMethod: "UPI"`, optional `utrNumber`, `notes`.
       - Inserts settlement record with status `"completed"`.
       - Inserts `settlementHistory` and `auditLogs`.
       - Calls `revalidatePath` on `/dashboard/groups/[id]`, `/dashboard/groups/[id]/settlements`, `/dashboard/settlements`, `/dashboard`.
    2. Ensure newly calculated remaining debt automatically drops to 0 or remaining amount, and old QR code cannot be reused.
  </action>
  <verify>
    npx tsc --noEmit
  </verify>
  <done>
    Payment execution updates database and UI reflects real-time changes immediately.
  </done>
</task>
