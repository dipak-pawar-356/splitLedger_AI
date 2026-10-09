---
phase: 6
plan: 2
wave: 2
gap_closure: false
---

# Plan 6.2: Master 15-Step Atomic Recalculation Engine & Universal Trigger Pipeline

## Objective
Implement the master 15-step atomic recalculation workflow in `recalculation-engine.ts` and integrate all group mutation operations (member approval, removal, expense creation, edit, deletion, restoration, and settlement completion) through this single authoritative recalculation engine, ensuring that no feature ever implements ad-hoc recalculation logic.

## Context
- `src/lib/settlements/recalculation-engine.ts`
- `src/actions/transactions.ts`
- `src/actions/group-members.ts`
- `src/actions/group-join-requests.ts`
- `src/actions/settlements.ts`
- `src/lib/db/schema/schema.ts`

## Tasks

<task type="auto">
  <name>Authoritative 15-Step Recalculation Engine Implementation</name>
  <files>
    src/lib/settlements/recalculation-engine.ts
  </files>
  <action>
    1. In `src/lib/settlements/recalculation-engine.ts`, ensure `executeAtomicGroupRecalculation` strictly follows the 15-step order:
       - Step 1: Exclusive group lock (per-group mutex preventing concurrent execution).
       - Step 2: Ensure schema tables exist (`member_participation_timeline`, `group_settlement_versions`, `expense_participation_history`).
       - Step 3: Load consistent snapshot from database only (group, members, active transactions, timelines, completed settlements). Never use client cache or previous dashboard values.
       - Step 4: Resolve expense participants independently for each transaction using the pure timeline evaluator.
       - Step 5: Recalculate paise-exact shares for affected expenses; record immutable snapshot in `expense_participation_history`.
       - Step 6: Persist updated splits in `expense_splits` and update `participation_version` and `redistribution_version` on transactions.
       - Step 7: Load all completed settlements (`status = 'completed'`). Completed settlements are strictly immutable and never modified or deleted.
       - Step 8: Calculate net member balances: `netPosition = (totalPaid - ownShare) + (settledPaid - settledReceived)`.
       - Step 9: Validate balance conservation: `sum(positive balances) === sum(abs(negative balances))` and `sum(all net balances) === 0`.
       - Step 10: Generate minimal outstanding pending settlements using greedy optimal matching (single payer, single receiver, no duplicates, no self-payments).
       - Step 11: Final integrity verification: verify total expenses === total shares, total pending payable === total pending receivable, completed settlements preserved.
       - Step 12: Superseed previous active settlement version and create new immutable record in `group_settlement_versions`.
       - Step 13: Write structured audit log record in `audit_logs`.
       - Step 14: Release group lock.
       - Step 15: Post-commit cache invalidation (`appCache`) and safe path revalidation (`safeRevalidatePath`).
    2. AVOID: Calling `revalidatePath` unguarded or calling `db.transaction()` over `neon-http` driver.
    3. USE: In-process mutex locking, sequential database queries, and `safeRevalidatePath`.
  </action>
  <verify>
    npx vitest run src/lib/__tests__/timeline-recalculation.test.ts
  </verify>
  <done>
    `executeAtomicGroupRecalculation` executes all 15 steps cleanly, maintains mathematical invariants down to 1 paise, and outputs immutable version records.
  </done>
</task>

<task type="auto">
  <name>Universal Recalculation Trigger Pipeline Across Group Operations</name>
  <files>
    src/actions/transactions.ts
    src/actions/group-members.ts
    src/actions/group-join-requests.ts
    src/actions/settlements.ts
  </files>
  <action>
    1. Wire `executeAtomicGroupRecalculation` into all group mutation actions:
       - `createTransaction`: On adding group expense, trigger `triggerOperation: "add_expense"`.
       - `updateTransaction`: On editing group expense, trigger `triggerOperation: "edit_expense"`.
       - `deleteTransaction`: On deleting group expense, clear splits and trigger `triggerOperation: "delete_expense"`.
       - `restoreTransaction`: On restoring group expense, trigger `triggerOperation: "restore_expense"`.
       - `removeGroupMember`: On removing member, record removal event in timeline and trigger `triggerOperation: "remove_member"`.
       - `approveJoinRequestAction`: On approving member, record timeline event (Mode A or Mode B) and trigger `triggerOperation: "approve_member_included"` or `"approve_member_excluded"`.
       - `rejectJoinRequestAction`: On rejecting member, clean up pending membership and trigger recalculation if needed.
       - `completeSettlementAction`: On completing offline or UPI settlement, update settlement status to `"completed"` and trigger recalculation to credit the payment and generate remaining pending balances.
    2. Ensure every trigger passes `groupId`, `initiatedByUserId`, and descriptive operation name.
  </action>
  <verify>
    npx vitest run
  </verify>
  <done>
    All group mutation operations trigger the single authoritative recalculation engine, ensuring total financial consistency across the application.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] No feature implements its own ad-hoc settlement calculation logic; all route through `recalculation-engine.ts`.
- [ ] Adding, editing, deleting, or restoring an expense immediately recalculates group shares and pending settlements.
- [ ] Removing or approving a member immediately recalculates group shares and pending settlements.
- [ ] Completed settlements are permanently preserved and credited.

## Success Criteria
- [ ] All 49 test suites pass cleanly with `npx vitest run`
- [ ] Next.js compiles with 0 errors via `npm run build`
