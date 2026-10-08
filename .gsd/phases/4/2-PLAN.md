---
phase: 4
plan: 2
wave: 2
gap_closure: false
---

# Plan 4.2: Comprehensive Validation & Dev Server Verification

## Objective
Verify the end-to-end Dynamic UPI QR settlement flow across multiple groups, multiple receivers, user profile UPI setup, ₹0 debt handling, and backend integrity checks. Validate code with TypeScript and Vitest tests, and confirm live dev server stability.

## Context
- Dev Server running on `http://localhost:3000`
- Vitest test suite

## Tasks

<task type="auto">
  <name>Run Tests and Validation Suite</name>
  <files>
    src/lib/payments/__tests__/upi.test.ts
  </files>
  <action>
    1. Write unit tests for UPI ID validation, URL construction, sanitization, and offline QR generation.
    2. Run `npm test` or `npx vitest run`.
    3. Run `npx tsc --noEmit` to verify type safety.
    4. Confirm dev server endpoints respond with 200 OK.
  </action>
  <verify>
    npm test && npx tsc --noEmit
  </verify>
  <done>
    All tests pass; zero TypeScript errors; dev server runs smoothly.
  </done>
</task>
