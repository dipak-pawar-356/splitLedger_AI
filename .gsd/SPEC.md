# SPEC.md — Dynamic UPI QR Settlement System

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: Requirements and architecture finalized for implementation.

## Vision
Transform SplitLedger AI's settlement mechanism into a frictionless, secure, and dynamic Indian UPI payment settlement system. Group members can settle their debts on demand with dynamically generated exact-amount UPI QR codes linked to verified primary receiver UPI IDs, maintaining strict group isolation, multi-receiver separation, real-time data freshness, and payment amount integrity.

---

## Key Requirements & Architecture

### 1. User UPI Setup
- Every user must have a mandatory **primary UPI ID** in their profile before they can receive settlement payments.
- If a user has not configured a UPI ID:
  - Display prominent guidance asking them to complete their payment profile before settlements can be generated for them.
  - Gracefully disable QR generation for that specific receiver while displaying an informative notice.
- Store one primary UPI ID per user (persisted in database on `users.upi_id` and `profiles.upi_id`).
- Strictly validate standard Indian VPA handles (e.g. `user@okhdfcbank`, `mobile@paytm`, `name@ybl`, `id@ibl`).

### 2. Group-Level Settlement Calculation & Isolation
- Settlement amounts are calculated independently for each group.
- Complete data isolation between groups: expenses, balances, and settlements of one group never bleed into or affect another group.
- Users can belong to multiple groups; each group dashboard shows only that group's settlement cards and QR codes.

### 3. Pay Now Flow & Dynamic On-Demand QR Generation
- Generate dynamic UPI QR codes only when a user triggers **Pay Now** or opens **Settlement**.
- QR code is generated on-demand dynamically using:
  - Receiver UPI ID (`pa`)
  - Receiver Name (`pn`)
  - Exact settlement amount for that payer calculated directly from the database (`am`)
  - Currency INR (`cu=INR`)
  - Secure transaction note / reference (`tn=SplitLedger settlement - {GroupName}`)
- No pre-generated QR images are stored in the database.
- Local high-resolution QR rendering using `qrcode` library without third-party API data exposure.

### 4. Multiple Receivers & Independent Cards
- When a user owes multiple people in the same group (e.g., Person A ₹500, Person B ₹1200):
  - Render separate, independent payment cards for each receiver.
  - Card 1: Receiver Avatar, Receiver Name, Amount ₹500, Dynamic QR, Pay Now button, Copy UPI ID, Copy Amount.
  - Card 2: Receiver Avatar, Receiver Name, Amount ₹1200, Dynamic QR, Pay Now button, Copy UPI ID, Copy Amount.
  - Each QR code encodes only that specific receiver's UPI ID and exact debt amount.

### 5. Receiving Payments (Owed to Current User)
- When other members owe money to the logged-in user:
  - Those debtor users see "Pay {CurrentUser} ₹X" with the current user's dynamic UPI QR and Pay Now button.
  - Generated automatically from the receiver's saved profile UPI ID without manual action from the receiver.
  - Logged-in user has an "Incoming Settlements / Owed to You" view tracking debtor status and previewing their own payment profile readiness.

### 6. UI Behaviour & Zero Settlement Handling
- Settlement Card includes:
  - Receiver Avatar & Name
  - Amount to Pay in INR (e.g., ₹500.00)
  - Generated dynamic QR Code
  - Pay Now button (triggers UPI deep-link intent `upi://pay?...` on mobile)
  - Quick App Deep-links (GPay, PhonePe, Paytm, BHIM)
  - Copy UPI ID button (with toast confirmation)
  - Copy Amount button (with toast confirmation)
  - Mark as Paid button
- If amount is ₹0:
  - Hide QR code and Pay Now button.
  - Display "No Settlement Pending" / "All Settled Up".

### 7. Security, Data Freshness & Payment Integrity
- **QR Security**: QR contains only standard UPI payment parameters (`pa`, `pn`, `am`, `cu`, `tn`, `tr`). Never expose passwords, phone numbers, email addresses, or database internal IDs.
- **Backend Single Source of Truth**: Settlement amounts are computed fresh from database transactions and completed settlements; never trust client-passed amounts.
- **Membership & Authorization Verification**: Payer and receiver must be verified active members of the same group.
- **Amount & Status Integrity**: If settlement is paid or cancelled, QR generation is invalidated immediately. Amounts are rounded to 2 decimal places.

---

## Success Criteria
- [ ] Primary UPI ID configurable, validated, and saved in user profile and synced across `users` and `profiles`.
- [ ] Users without UPI ID see clear prompts to complete payment profile; QR generation for receivers without UPI ID fails gracefully with friendly UI guidance.
- [ ] Dynamic QR codes generated on-demand with exact database-verified amounts in INR.
- [ ] Multiple receivers in a group display independent payment cards with their own dynamic QR codes.
- [ ] Cross-group isolation verified: settlements in Group A never alter balances or QR codes in Group B.
- [ ] Dev server runs smoothly in background with real-time UI updates.
