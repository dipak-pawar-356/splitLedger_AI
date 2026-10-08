---
phase: 3
plan: 2
wave: 2
gap_closure: false
---

# Plan 3.2: Multi-Receiver Grid & Receiving Payments View Integration

## Objective
Integrate multi-receiver settlement grids into group pages (`/dashboard/groups/[id]` and `/dashboard/groups/[id]/settlements`). When a user owes multiple people (e.g. Person A ₹500, Person B ₹1200), display independent cards for each receiver. Also show the "Receiving Payments" section where users see who owes them and verify their own profile readiness.

## Context
- `src/components/group/who-pays-whom-card.tsx`
- `src/app/dashboard/groups/[id]/page.tsx`
- `src/app/dashboard/groups/[id]/settlements/page.tsx`
- `src/components/settlement/group-upi-settlement-hub.tsx`

## Tasks

<task type="auto">
  <name>Integrate Multi-Receiver Settlement Hub in Group Pages</name>
  <files>
    src/components/settlement/group-upi-settlement-hub.tsx
    src/app/dashboard/groups/[id]/page.tsx
    src/app/dashboard/groups/[id]/settlements/page.tsx
  </files>
  <action>
    1. Create `GroupUpiSettlementHub` which fetches/receives fresh settlements for the group.
    2. Display independent cards for each person the user owes in this group.
    3. Display a dedicated "Money Owed to You" section showing other members who owe the current user, confirming the user's UPI ID is ready for them to scan.
    4. Provide banner if current user has not added their UPI ID: "You have money to receive, but haven't added a UPI ID! Add it in profile now."
    5. Embed `GroupUpiSettlementHub` into the group detail page and settlements sub-page.
  </action>
  <verify>
    npx tsc --noEmit
  </verify>
  <done>
    Multi-receiver independent payment cards display cleanly and group isolation is strictly maintained.
  </done>
</task>
