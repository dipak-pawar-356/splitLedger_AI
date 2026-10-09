# Plan 6.1 Summary: Timeline Analytical Model & Expense-Level Participant Resolution Engine

## Objectives Achieved
1. **Enhanced Timeline Model**: Extended the analytical timeline model in `recalculation-engine.ts` supporting distinct lifecycle intervals (Mode A "included", Mode B "excluded", joined, removed, rejoined) without ever inferring participant counts from the current active member count.
2. **Pure Interval Evaluator**: Implemented and verified `isMemberEligibleForExpense` and `determineExpenseEligibleParticipants`:
   - Mode A member removal automatically reverts historical expenses to pre-join participants and recalculates future expenses without them.
   - Mode B member removal leaves historical expenses completely untouched and recalculates only expenses created after the member joined.
3. **Diff-Based Split Preservation**: Implemented `hasParticipantSetOrSharesChanged` to detect whether participant membership or share amounts changed for each expense, updating and versioning only affected expenses while keeping unaffected historical records untouched.
4. **Paise-Exact Share Calculation**: Guaranteed that the sum of distributed shares equals the total expense down to the exact paise.

## Verification
- `src/lib/__tests__/timeline-recalculation.test.ts`: 19 tests passed (100% pass rate).
- `npx tsc --noEmit`: 0 errors.
- Git commit: `47c65e6 feat(phase-6): timeline analytical model and diff-based recalculation`.
