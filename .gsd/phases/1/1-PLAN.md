---
phase: 1
plan: 1
wave: 1
gap_closure: false
---

# Plan 1.1: Database Schema & Migration & Auth Synchronization

## Objective
Add `upiId` to `users` and `profiles` tables in Drizzle schema and `auto-migrate.ts`. Synchronize `src/lib/auth.ts` so current user queries always return `upiId`, ensuring seamless database access across all actions and components.

## Context
- `src/lib/db/schema/schema.ts`
- `src/lib/db/auto-migrate.ts`
- `src/lib/auth.ts`

## Tasks

<task type="auto">
  <name>Extend Drizzle Schema and Auto-Migrate</name>
  <files>
    src/lib/db/schema/schema.ts
    src/lib/db/auto-migrate.ts
  </files>
  <action>
    1. In `src/lib/db/schema/schema.ts`:
       - Add `upiId: text("upi_id")` to `users` table definition.
       - Add `upiId: text("upi_id")` to `profiles` table definition.
       - Add index for `upiId` if appropriate.
    2. In `src/lib/db/auto-migrate.ts`:
       - Add `ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id TEXT;`
       - Add `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;`
       - Add `CREATE INDEX IF NOT EXISTS users_upi_id_idx ON users(upi_id);`
  </action>
  <verify>
    npm run build or type-check via npx tsc --noEmit
  </verify>
  <done>
    users and profiles tables declare upiId, auto-migrate guarantees columns exist on Neon postgres without manual intervention.
  </done>
</task>

<task type="auto">
  <name>Synchronize Auth User Definition</name>
  <files>
    src/lib/auth.ts
  </files>
  <action>
    1. In `src/lib/auth.ts`:
       - Add `upiId: users.upiId` in `USER_COLUMNS`.
       - Add `upiId: "dipak@okhdfcbank"` (or null) to `DEV_USER`.
  </action>
  <verify>
    npx tsc --noEmit
  </verify>
  <done>
    getCurrentUser() returns upiId as part of the typed user object.
  </done>
</task>
