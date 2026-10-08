# Changes Specification: Dynamic UPI QR Settlements, Historical Redistribution & QR Group Joining

> **Specification Document**: Single comprehensive file detailing all architectural, database, backend, and UI changes to be executed for SplitLedger AI.

---

## 1. Executive Summary & Core Objectives

This implementation delivers exact financial accounting, historical expense redistribution with owner consent, and secure group joining via dynamic QR codes:

1. **Exact Financial Integrity & Balance Separation**:
   - Strict separation between **Gross Expense Paid**, **Gross Share**, **Completed Settlement Paid**, **Completed Settlement Received**, **Outstanding Payable**, and **Outstanding Receivable**.
   - Net Balance is defined as: `Net Balance = Gross Expense Paid - Gross Share`.
   - Completed settlements do not alter Net Balance; they directly and permanently satisfy pair-wise outstanding settlement obligations.
   - Settlement preservation: completed settlements are permanent immutable financial records and are never deleted, recalculated, or requested again.
   - Payment QR codes encode **only** the remaining *Outstanding Payable* (never gross expense or share).

2. **Group Joining Through Secure QR Code**:
   - Fix group QR code generation so it always encodes the exact, specific group join URL: `/join-group/{groupPublicId}` using the current origin (eliminating generic homepage/base URL redirects).
   - Logged-out users scanning the QR see group details and an authenticated return flow (`/sign-in?redirect_url=/join-group/{groupPublicId}`) that preserves the target group throughout login/signup.
   - Logged-in non-members scanning the QR can submit a `PENDING` Join Request. Users are never added automatically without owner consent.

3. **Atomic Join Approval & Historical Expense Redistribution**:
   - Group Owner receives join requests with **Approve** and **Reject** controls.
   - Upon clicking Approve, Owner chooses:
     - **Option A**: *Include new member in previous group expenses* (redistributes historical expenses across the expanded participant set, recalculating shares, net balances, and pending settlements while preserving completed settlements).
     - **Option B**: *Do not include new member in previous group expenses* (new member historical share is ₹0; previous member historical shares remain untouched).
   - Entire approval and redistribution runs inside a single atomic database transaction with concurrency safeguards and immutable audit logging.

4. **Multi-Receiver Independent Settlement Cards**:
   - If a member owes multiple people in the same group (e.g. Person 3 owes Person 1 ₹490 and Person 4 ₹1000), render independent cards with their respective receiver avatars, names, exact amounts, and on-demand dynamic QR codes.

---

## 2. Mathematical Accounting & State Transitions

### Initial Group State (3 Members)
- Person 1 paid **₹1400**
- Person 2 paid **₹870**
- Person 3 paid **₹400**
- Total Expense: **₹2670**
- Equal Share (3 members): **₹890 per member**
- Net Balances:
  - Person 1: $1400 - 890 = +\text{₹}510$
  - Person 2: $870 - 890 = -\text{₹}20$
  - Person 3: $400 - 890 = -\text{₹}490$
- Outstanding Obligations:
  - Person 2 pays **₹20** to Person 1
  - Person 3 pays **₹490** to Person 1

### After Person 2 Pays ₹20 to Person 1
- Person 1:
  - Gross Expense Paid = ₹1400
  - Completed Settlement Received = ₹20
  - Outstanding Receivable = ₹490 (from Person 3)
- Person 2:
  - Gross Expense Paid = ₹870
  - Completed Settlement Paid = ₹20
  - Total Contribution (labeled display) = ₹890
  - Outstanding Payable = ₹0 (No pending payment to Person 1; never requested again)
- Person 3:
  - Gross Expense Paid = ₹400
  - Completed Settlement Paid = ₹0
  - Outstanding Payable = ₹490 to Person 1 (QR for ₹490)

### Person 4 Joins & Owner Selects "Include in Previous Expenses"
- Historical Total: **₹2670** redistributed across 4 members:
  - Equal Share: $\text{₹}2670 / 4 = \text{₹}667.50\text{ per member}$
  - Person 4 paid ₹0, owes ₹667.50
- When Person 4 adds a new expense (e.g. ₹4000) or subsequent expenses:
  - Total recalculates dynamically from committed database records.
  - Previous completed settlement of ₹20 by Person 2 is credited and never re-created.
  - Person 3 sees two independent settlement cards:
    - Card 1: Pay ₹490 to Person 1 (QR for ₹490)
    - Card 2: Pay remaining obligation to Person 4 (QR for exact remaining amount)

---

## 3. Detailed File Changes & Additions

### A. Database Schema & Auto-Migration
1. **[`src/lib/db/schema/schema.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/db/schema/schema.ts)**:
   - Add `groupJoinRequests` table:
     - `id`: serial primary key
     - `publicId`: text unique not null
     - `groupId`: integer foreign key -> `groups.id`
     - `userId`: integer foreign key -> `users.id`
     - `status`: text (`pending`, `approved`, `rejected`) default `pending`
     - `includeInHistoricalExpenses`: boolean default `false`
     - `approvedBy`: integer foreign key -> `users.id`
     - `approvedAt`: timestamp
     - `rejectedAt`: timestamp
     - `notes`: text
     - `createdAt`: timestamp
     - `updatedAt`: timestamp
   - Add relations for `groupJoinRequests` with `groups` and `users`.
   - Export TypeScript types `GroupJoinRequest` and `NewGroupJoinRequest`.
2. **[`src/lib/db/auto-migrate.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/db/auto-migrate.ts)**:
   - Add DDL SQL statements to create `group_join_requests` table and indexes automatically on application boot if they do not exist.

### B. Group Join Requests & Atomic Approval Server Actions
3. **[`src/actions/group-join-requests.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/actions/group-join-requests.ts)** *(New File)*:
   - `getGroupJoinDetailsAction(groupPublicId)`: Verifies group existence, membership status, and active join request status for current user.
   - `submitGroupJoinRequestAction(groupPublicId)`: Validates authenticated user is not already a member and has no active pending request; creates `PENDING` request.
   - `getPendingJoinRequestsForGroupAction(groupId)`: Authorizes group owner/admin; returns pending requests with applicant details.
   - `approveJoinRequestAction({ requestId, includeInHistoricalExpenses })`:
     - Runs in atomic database transaction:
       1. Verifies caller is group owner.
       2. Verifies request status is `pending`.
       3. Updates request status to `approved`.
       4. Adds applicant to `groupMembers`.
       5. If `includeInHistoricalExpenses === true`, invokes `redistributeGroupHistoricalExpensesInternal(groupId, applicantUserId)`.
       6. Recalculates group settlements and invalidates stale QR caches.
       7. Records immutable audit log.
       8. Broadcasts real-time notification to applicant and group members.
       9. Revalidates Next.js cache paths (`/dashboard/groups/[id]`, `/dashboard/groups/[id]/settlements`).
   - `rejectJoinRequestAction({ requestId })`:
     - Updates request status to `rejected`, writes audit log, revalidates paths.

### C. Historical Expense Redistribution Engine
4. **[`src/actions/historical-redistribution.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/actions/historical-redistribution.ts)** *(New File)*:
   - `redistributeGroupHistoricalExpenses(groupId, newUserId)`:
     - Fetches all active non-deleted expenses in the group.
     - Fetches all active members.
     - Redistributes equal/shared expense splits to include the new member without altering original expense amounts or payers.
     - Preserves all completed settlements!
     - Recomputes member shares and remaining outstanding payables/receivables.

### D. Group Joining & QR Code Fixes
5. **[`src/lib/utils.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/utils.ts)**:
   - Enhance `generateGroupJoinUrl(groupPublicId)`: dynamically resolves `window.location.origin` in browser or `NEXT_PUBLIC_APP_URL` in SSR, ensuring the join link targets `/join-group/{groupPublicId}` instead of base URL.
6. **[`src/components/group/unique-group-invitation-dialog.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/components/group/unique-group-invitation-dialog.tsx)**:
   - Update QR generation to use local in-process QR data URLs and point directly to the group-specific join route `/join-group/${groupPublicId}`.
7. **[`src/app/join-group/[token]/page.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/app/join-group/%5Btoken%5D/page.tsx)**:
   - Transform into a dedicated group join experience:
     - Supports both `publicId` and invitation tokens.
     - If logged out: displays group preview and "Sign In to Join" with redirect preserve.
     - If logged in & already a member: provides "Already a Member — Go to Dashboard" link.
     - If logged in & pending request: displays "Join Request Submitted — Waiting for Owner Approval".
     - If logged in & eligible: provides "Request to Join Group" button.

### E. Owner Join Request Approval Modal & Banners
8. **[`src/components/group/pending-join-requests-card.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/components/group/pending-join-requests-card.tsx)** *(New File)*:
   - Card displayed to Group Owner in `/dashboard/groups/[id]` showing pending applicants.
   - Clicking "Approve" opens an approval dialog with radio/toggle choice:
     - *"Include new member in previous group expenses"*
     - *"Do not include new member in previous group expenses"*
   - Executes atomic approval and refreshes group dashboard with live updates.
9. **[`src/app/dashboard/groups/[id]/page.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/app/dashboard/groups/%5Bid%5D/page.tsx)**:
   - Integrate `PendingJoinRequestsCard` at the top of the group details page for group owners.

### F. Financial Balances & Settlement UI
10. **[`src/actions/upi-settlements.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/actions/upi-settlements.ts)**:
    - Update balance calculations to strictly compute and return:
      - `grossExpensePaid`
      - `grossShare`
      - `completedSettlementPaid`
      - `completedSettlementReceived`
      - `outstandingPayable`
      - `outstandingReceivable`
      - `totalContribution` (`grossExpensePaid + completedSettlementPaid`)
    - Ensure completed settlements reduce outstanding pair-wise debt obligations directly.
11. **[`src/components/settlement/group-upi-settlement-hub.tsx`](file:///d:/Project_2k24_25/splitLedger_AI/src/components/settlement/group-upi-settlement-hub.tsx)**:
    - Display financial summary cards breaking down Gross Expense Paid, Gross Share, Completed Settlements, and Outstanding Balances.
    - Multi-receiver support: renders independent settlement cards for each receiver with separate dynamic QR codes and Pay Now buttons.

### G. Unit & Integration Tests
12. **[`src/lib/settlements/__tests__/historical-redistribution.test.ts`](file:///d:/Project_2k24_25/splitLedger_AI/src/lib/settlements/__tests__/historical-redistribution.test.ts)** *(New File)*:
    - Unit tests covering the exact sequence:
      1. 3 members (₹1400, ₹870, ₹400 -> share ₹890).
      2. Person 2 pays ₹20 to Person 1 -> outstanding payable becomes ₹0.
      3. Person 4 joins with historical inclusion -> equal share becomes ₹667.50.
      4. Person 4 adds ₹4000 expense -> recalculation with completed ₹20 preserved.
      5. Verification of total payables = total receivables, no negative amounts, no duplicate requests.

---

## 4. Execution Plan & Rollout Sequence

1. **Step 1**: Database schema (`groupJoinRequests`) and auto-migration update.
2. **Step 2**: Historical expense redistribution & financial balance calculator logic with unit tests.
3. **Step 3**: Group join request server actions (`submit`, `approve`, `reject`) with atomic transaction support.
4. **Step 4**: Group join route (`/join-group/[token]`) & QR generation fix with correct group URL.
5. **Step 5**: Group owner UI integration (Join request approval dialog with historical inclusion options).
6. **Step 6**: Multi-receiver independent settlement cards & separate financial balance display.
7. **Step 7**: Verification via TypeScript compile check (`tsc --noEmit`), Vitest suite, and live dev server.
