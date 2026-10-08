---
phase: 1
plan: 2
wave: 2
gap_closure: false
---

# Plan 1.2: User Profile UI & Server Action with UPI ID Management

## Objective
Update `src/actions/profile.ts`, `src/components/profile/personal-info-form.tsx`, and `src/components/profile/profile-center-client-view.tsx` to view, validate, and edit the primary UPI ID, showing completion status and warning banners when missing.

## Context
- `src/actions/profile.ts`
- `src/components/profile/personal-info-form.tsx`
- `src/components/profile/profile-center-client-view.tsx`
- `src/lib/payments/upi.ts`

## Tasks

<task type="auto">
  <name>Update Profile Server Actions for UPI ID</name>
  <files>
    src/actions/profile.ts
  </files>
  <action>
    1. Include `upiId: string | null` in `ProfileDetails.user` and `ProfileDetails.profile`.
    2. In `getProfileDetails`: query `users.upiId` (and `profiles.upiId`). If `upiId` is missing, include `"upiId"` in `missingFields` and add recommendation: "Add your Primary UPI ID to receive settlements via QR".
    3. In `updateProfileDetails`: accept `upiId?: string`. If provided, validate format with `validateUpiId`. Update both `users.upiId` and `profiles.upiId`.
  </action>
  <verify>
    npx tsc --noEmit
  </verify>
  <done>
    Profile action safely handles fetching and saving user's primary UPI ID with validation.
  </done>
</task>

<task type="auto">
  <name>Enhance Profile UI with UPI Setup & Missing UPI Warning</name>
  <files>
    src/components/profile/personal-info-form.tsx
    src/components/profile/profile-center-client-view.tsx
  </files>
  <action>
    1. In `personal-info-form.tsx`: Add dedicated UPI ID input field with validation feedback, bank handle suggestions, and helper text.
    2. In `profile-center-client-view.tsx`:
       - Replace hardcoded `@okaxis` with actual user UPI ID or "Not configured" state.
       - Display a prominent Alert banner if UPI ID is not configured: "Payment Profile Incomplete: You must configure a primary UPI ID to receive group settlements via QR."
       - Provide quick action button to enter UPI ID.
  </action>
  <verify>
    Check rendered profile in dev server or compile with npx tsc --noEmit
  </verify>
  <done>
    Users can view, edit, and save their UPI ID; clear warning shown when missing.
  </done>
</task>
