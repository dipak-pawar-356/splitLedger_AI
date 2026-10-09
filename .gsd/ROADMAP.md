---
milestone: Dynamic UPI QR Settlement System
version: 1.0.0
updated: 2026-10-08T14:35:00+05:30
---

# Roadmap

> **Current Phase:** All Phases Complete (Milestone Complete)
> **Status:** ✅ Verified & Done

## Must-Haves (from SPEC)

- [x] Every user profile supports a validated primary UPI ID stored in DB
- [x] Profile prompt/banner shown when UPI ID is missing
- [x] On-demand dynamic UPI QR generation using local `qrcode` engine (no external third-party API leak)
- [x] Exact database-verified settlement amount in INR formatted to 2 decimals
- [x] Multi-receiver independent settlement cards within groups
- [x] Complete group-level isolation: settlements in Group A never affect Group B
- [x] Pay Now button with UPI deep links (GPay, PhonePe, Paytm, BHIM)
- [x] Copy UPI ID and Copy Amount actions
- [x] Graceful ₹0 handling ("No Settlement Pending") and missing UPI warning
- [x] Data freshness: real-time updates and invalidation when paid

---

## Phases

### Phase 1: User Profile UPI Setup & Schema Integration
**Status:** ✅ Complete
**Objective:** Add `upi_id` to database schema (`users` and `profiles`), update auto-migrate and auth user columns, implement profile server action updates with UPI validation, and enhance the Profile UI (`/dashboard/profile`) to allow viewing, validating, and updating the primary UPI ID, along with prompt banners when missing.

**Plans:**
- [x] Plan 1.1: Database Schema & Migration & Auth Synchronization
- [x] Plan 1.2: User Profile UI & Server Action with UPI ID Management

---

### Phase 2: Dynamic UPI QR Engine & Backend Integrity Verification
**Status:** ✅ Complete
**Objective:** Upgrade UPI utility with offline/in-app `qrcode` generation (SVG & DataURL), enforce parameter sanitization (only `pa`, `pn`, `am`, `cu`, `tn`, `tr`), and build a dedicated server action that calculates fresh group-isolated debts, verifies receiver UPI status, and signs off on dynamic QR generation.

**Plans:**
- [x] Plan 2.1: Secure Offline UPI QR Engine & Parameter Sanitizer
- [x] Plan 2.2: Group-Isolated Dynamic Settlement Calculation & Integrity Endpoint

---

### Phase 3: Multi-Receiver Settlement Cards & Group Dashboard Integration
**Status:** ✅ Complete
**Objective:** Build `DynamicUpiSettlementCard` component with receiver avatar, name, dynamic QR, Pay Now button, deep links, Copy UPI, Copy Amount, and integrate multi-receiver settlement grids into group detail (`/dashboard/groups/[id]`) and group settlements (`/dashboard/groups/[id]/settlements`).

**Plans:**
- [x] Plan 3.1: Dynamic Settlement Card Component with Multi-App Support
- [x] Plan 3.2: Multi-Receiver Grid & Receiving Payments View Integration

---

### Phase 4: Payment Execution, Real-Time Revalidation & Verification
**Status:** ✅ Complete
**Objective:** Connect "Mark as Paid" action to invalidate previous QR, record settlement history/audit logs, revalidate group balances in real-time, test the dev server in the background, and perform end-to-end verification.

**Plans:**
- [x] Plan 4.1: Real-Time Payment Invalidation & Settlement History
- [x] Plan 4.2: Comprehensive Validation & Dev Server Verification

---

### Phase 5: Historical Expense Redistribution & QR Group Joining
**Status:** ✅ Complete
**Objective:** Implement group QR link joining, owner approval dialog with historical inclusion choice, and atomic redistribution across expenses.

**Plans:**
- [x] Plan 5.1: Group QR Join Flow & Pending Requests State
- [x] Plan 5.2: Atomic Owner Approval with Historical Decision Selection

---

### Phase 6: Timeline-Based Member Removal & Authoritative Recalculation Engine
**Status:** ⏳ Planned
**Objective:** Implement an authoritative timeline-based recalculation engine where expense participants are resolved independently from member lifecycle timelines (Mode A vs Mode B, joined, removed, rejoined) without ever relying on current group member counts. Completed settlements are preserved as immutable, and dynamic UPI QR and dashboard views reflect fresh recalculated balances.

**Plans:**
- [ ] Plan 6.1: Timeline Analytical Model & Expense-Level Participant Resolution Engine (wave 1)
- [ ] Plan 6.2: Master 15-Step Atomic Recalculation Engine & Universal Trigger Pipeline (wave 2)
- [ ] Plan 6.3: Downstream Financial State, Dynamic UPI QR Freshness & UI Dashboard Synchronization (wave 3)

