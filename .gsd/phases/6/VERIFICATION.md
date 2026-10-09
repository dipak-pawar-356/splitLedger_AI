# Phase 6 Verification: Timeline-Based Member Removal & Authoritative Recalculation Engine

## Phase Objective
Implement an authoritative timeline-based recalculation engine where expense participants are resolved independently from member lifecycle timelines (Mode A vs Mode B, joined, removed, rejoined) without ever relying on current group member counts. Completed settlements are preserved as immutable, and dynamic UPI QR and dashboard views reflect fresh recalculated balances.

## Must-Haves Verification

| Requirement | Status | Evidence |
|---|---|---|
| **Never calculate based only on current member count** | VERIFIED | `recalculation-engine.ts` evaluates each expense independently against member timelines using `isMemberEligibleForExpense` and `determineExpenseEligibleParticipants`. |
| **Mode A member removal reverts historical expenses** | VERIFIED | Unit tests in `timeline-recalculation.test.ts` assert historical expenses revert from P1..P4 to P1..P3 upon P4 removal. |
| **Mode B member removal leaves historical expenses untouched** | VERIFIED | Unit tests in `timeline-recalculation.test.ts` assert historical expenses remain strictly P1..P4 and only expenses created while active are recalculated upon P6 removal. |
| **Paise-exact share distribution** | VERIFIED | `calculateSharesForExpense` distributes integer paise such that `sum(shares) === expenseAmountPaise`. |
| **Completed settlements immutable & credited** | VERIFIED | `calculateMemberNetBalances` and `executeAtomicGroupRecalculation` credit completed settlements toward net balances and never delete completed records. |
| **Single Authoritative Universal Recalculation Trigger** | VERIFIED | Wired into `createTransaction`, `updateTransaction`, `deleteTransaction`, `restoreTransaction`, `removeGroupMember`, `approveJoinRequestAction`, `markSettlementAsPaid`, and `updateSettlement`. |
| **Active member count excludes pending members** | VERIFIED | `getGroupFinancialDetails` filters `activeMembers` strictly where `membershipStatus === 'active'` and `isGuest === false`. |
| **Dynamic UPI QR reflects fresh recalculated balances** | VERIFIED | `getGroupUpiSettlementsAction` reads authoritative pending settlements directly from the database snapshot. |
| **Production Build Pass** | VERIFIED | `npm run build` exits 0 with zero static generation or TypeScript errors. |
| **Test Suite Pass** | VERIFIED | 49 test suites (350 tests) passing in Vitest. |

## Verdict: PASS
All requirements from the master specification are empirically verified and tested.
