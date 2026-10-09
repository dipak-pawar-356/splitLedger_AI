---
phase: 5
plan: 2
wave: 2
gap_closure: false
---

# Plan 5.2: Atomic Owner Approval with Historical Decision Selection

## Objective
Implement atomic owner/admin approval interface and backend action with mandatory Mode A ("Include in Previous Expenses") vs Mode B ("Start From New Expenses Only") selection, triggering timeline recording and atomic recalculation.

## Context
- `src/actions/group-join-requests.ts`
- `src/components/group/pending-join-requests-card.tsx`
- `src/lib/settlements/recalculation-engine.ts`
- `.gsd/SPEC.md`

## Tasks

<task type="auto">
  <name>Atomic Owner Approval Action & Decision UI</name>
  <files>
    src/actions/group-join-requests.ts
    src/components/group/pending-join-requests-card.tsx
  </files>
  <action>
    - Mandatory participation choice: Mode A ("included") or Mode B ("excluded").
    - Allow approval by Group Owner and any member with delegated group:approve_members permission with 100% success rate.
    - Transition member to 'active' status and record timeline event.
    - Trigger atomic group recalculation.
  </action>
  <verify>
    npx vitest run src/lib/__tests__/member-approval-and-activation.test.ts
  </verify>
  <done>
    Approval requires explicit choice, transitions status to active, and updates settlements.
  </done>
</task>

## Success Criteria
- [ ] Owner or delegated admin can approve requests with 100% success rate
- [ ] Radio choice enforces Mode A vs Mode B
- [ ] Atomic recalculation runs upon approval
