---
phase: 6
plan: 1
wave: 1
gap_closure: false
---

# Plan 6.1: Timeline Analytical Model & Expense-Level Participant Resolution Engine

## Objective
Implement a pure, database-backed analytical timeline evaluator in `recalculation-engine.ts` that models discrete member lifecycles (Mode A "Include in Previous Expenses", Mode B "Start From New Expenses Only", joined, removed, rejoined) and resolves eligible participants independently for every individual expense without ever inferring from the current group member count.

## Context
- `src/lib/settlements/recalculation-engine.ts`
- `src/lib/db/schema/schema.ts`
- `src/lib/__tests__/timeline-recalculation.test.ts`
- `.gsd/SPEC.md`

## Tasks

<task type="auto">
  <name>Comprehensive Member Timeline Analytical Evaluator</name>
  <files>
    src/lib/settlements/recalculation-engine.ts
  </files>
  <action>
    1. In `src/lib/settlements/recalculation-engine.ts`:
       - Enhance `TimelineEntry` structure to model member participation history:
         - `groupId`: number
         - `userId` / `contactId`: participant identifier
         - `participationMode`: `"included"` (Mode A) | `"excluded"` (Mode B)
         - `effectiveFrom`: Date (approval / activation timestamp)
         - `effectiveUntil`: Date | null (removal timestamp or null if currently active)
         - `approvedBy`: number | null
         - `reason`: string
         - `redistributionVersion`: number
       - Implement pure evaluator `isMemberEligibleForExpenseAtTimestamp(entries: TimelineEntry[], expenseCreatedAt: Date)`:
         - For Mode B ("excluded" / Start From New Expenses Only):
           Member participates ONLY IF `expenseCreatedAt >= entry.effectiveFrom` AND (`entry.effectiveUntil == null` OR `expenseCreatedAt < entry.effectiveUntil`).
           Member NEVER participates in expenses created before `effectiveFrom`.
         - For Mode A ("included" / Include in Previous Expenses):
           If member was removed (`entry.effectiveUntil != null`):
           - Historical expenses (`expenseCreatedAt < entry.effectiveFrom`): Member is removed from historical participant lists, restoring those expenses to the participants that existed before this member was added.
           - Future expenses created during active period (`expenseCreatedAt >= entry.effectiveFrom` and `< entry.effectiveUntil`): Since the member is removed from the group, future expenses are recalculated without them.
           - If member is currently active (`entry.effectiveUntil == null`): Member participates in all historical and future expenses.
       - Support multiple participation lifecycles (if a removed member rejoins later, each period is tracked as a distinct timeline interval).
    2. AVOID: Inferring expense participants from the current active member list or dividing expenses by current member count.
    3. USE: Pure chronological interval checks matching each individual expense timestamp against member timeline records.
  </action>
  <verify>
    npx vitest run src/lib/__tests__/timeline-recalculation.test.ts
  </verify>
  <done>
    `isMemberEligibleForExpenseAtTimestamp` correctly determines member eligibility across Mode A, Mode B, active, and removed states for any expense timestamp.
  </done>
</task>

<task type="auto">
  <name>Expense-Level Participant Resolution & Diff-Based Share Calculation</name>
  <files>
    src/lib/settlements/recalculation-engine.ts
    src/lib/__tests__/timeline-recalculation.test.ts
  </files>
  <action>
    1. In `src/lib/settlements/recalculation-engine.ts`:
       - Implement `resolveExpenseParticipants(expense: { id: number; amount: number; createdAt: Date }, timelines: TimelineEntry[], existingSplits?: Array<{ userId?: number; contactId?: number }>)`:
         - Evaluates all member timelines against `expense.createdAt`.
         - Identifies the exact list of eligible participants for this expense.
         - Performs diff detection: compares resolved participants with previous participant set.
         - Only recalculates shares if the participant set changed, leaving unaffected historical expenses untouched.
       - Implement `calculateSharesForExpense(amountPaise: number, participants: ParticipantKey[])`:
         - Distributes paise-accurate shares such that sum of shares exactly equals total expense amount down to 1 paise.
    2. In `src/lib/__tests__/timeline-recalculation.test.ts`:
       - Implement unit tests covering Section 5 & 7 of the specification:
         - Initial P1, P2, P3 (Mode A).
         - P4 joins with Mode A (historical redistributed among P1, P2, P3, P4).
         - P5 joins with Mode B (historical unchanged among P1, P2, P3, P4; future Expense A has P1-P5).
         - P6 joins with Mode B (historical unchanged; future Expense B has P1-P6).
         - Remove P6: Historical unchanged (P1-P4); Expense A unchanged (P1-P5); Expense B recalculated (P1-P5).
         - Remove P4: Historical automatically reverts to P1, P2, P3; Expense A becomes P1, P2, P3, P5; Expense B becomes P1, P2, P3, P5, P6.
  </action>
  <verify>
    npx vitest run src/lib/__tests__/timeline-recalculation.test.ts
  </verify>
  <done>
    Scenario 7 passes 100% with empirical assertions verifying that historical expenses revert to P1-P3 upon P4 removal and Mode B expenses only modify expenses where P6 actually participated.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Every individual expense resolves its participant set independently based on timeline history.
- [ ] Mode A member removal reverts historical expenses to pre-join participants and recalculates future expenses without them.
- [ ] Mode B member removal leaves historical expenses completely untouched and recalculates only expenses where they participated.
- [ ] Unit tests pass without mocks masking business logic.

## Success Criteria
- [ ] All unit tests pass in `timeline-recalculation.test.ts`
- [ ] Zero TypeScript errors via `npx tsc --noEmit`
