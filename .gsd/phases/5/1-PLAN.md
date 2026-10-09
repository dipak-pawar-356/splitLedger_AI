---
phase: 5
plan: 1
wave: 1
gap_closure: false
---

# Plan 5.1: Group QR Join Flow & Pending Requests State

## Objective
Implement group-specific QR link generation and request-to-join flow such that scanned QR codes direct users to `/join-group/[token]` with pending access isolation, preventing unapproved users from accessing group details or being counted as active members.

## Context
- `src/lib/utils.ts`
- `src/actions/group-join-requests.ts`
- `src/app/join-group/[token]/page.tsx`
- `src/components/group/pending-group-access-view.tsx`
- `.gsd/SPEC.md`

## Tasks

<task type="auto">
  <name>Group QR Route & Join Request Submission</name>
  <files>
    src/lib/utils.ts
    src/actions/group-join-requests.ts
    src/app/join-group/[token]/page.tsx
  </files>
  <action>
    - Ensure `generateGroupJoinUrl(groupPublicId)` targets `/join-group/${groupPublicId}` using window.location.origin in client or NEXT_PUBLIC_APP_URL in server.
    - Provide `submitGroupJoinRequestAction` to create a PENDING join request and set group member membershipStatus to 'pending'.
    - If user is logged out, provide 'Sign In to Join' preserving destination group URL.
  </action>
  <verify>
    npx vitest run src/lib/__tests__/randomized-group-and-invitation-ids.test.ts
  </verify>
  <done>
    Group QR URLs resolve to group join pages and unapproved requests enter pending status.
  </done>
</task>

## Success Criteria
- [ ] QR encodes exact join route `/join-group/{groupPublicId}`
- [ ] Non-member scanner can submit pending join request
