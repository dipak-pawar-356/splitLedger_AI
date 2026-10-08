---
phase: 3
plan: 1
wave: 1
gap_closure: false
---

# Plan 3.1: Dynamic Settlement Card Component with Multi-App Support

## Objective
Create `src/components/settlement/dynamic-upi-settlement-card.tsx` rendering receiver avatar, name, exact settlement amount in INR, dynamically generated QR code, Pay Now button (triggering mobile deep link intent), Copy UPI ID button, Copy Amount button, preferred UPI app quick links (GPay, PhonePe, Paytm, BHIM), and graceful states for ₹0 debts and missing receiver UPI IDs.

## Context
- `src/components/settlement/dynamic-upi-settlement-card.tsx`
- `src/lib/payments/upi.ts`
- `src/actions/upi-settlements.ts`

## Tasks

<task type="auto">
  <name>Build DynamicUpiSettlementCard Component</name>
  <files>
    src/components/settlement/dynamic-upi-settlement-card.tsx
  </files>
  <action>
    1. Render Receiver Avatar, Receiver Name, and Amount formatted as `₹X.XX`.
    2. Render dynamic QR Code with crisp display, zoom modal, and download option.
    3. Include "Pay Now" button linking to `upi://pay?...`.
    4. Include "Copy UPI ID" and "Copy Amount" buttons with copy-to-clipboard toast feedback.
    5. Include quick app switches for GPay, PhonePe, Paytm, and BHIM.
    6. Include "Mark as Paid" action button with confirmation dialog.
    7. If receiver UPI ID is missing: show clear amber warning banner "Receiver has not configured a UPI ID yet. Settlements cannot be processed until they complete their payment profile.", hide QR and Pay Now.
    8. If amount is ₹0: display "No Settlement Pending" with emerald checkmark, hide QR and Pay Now.
  </action>
  <verify>
    npx tsc --noEmit
  </verify>
  <done>
    Component renders all required UI elements and meets all UX criteria.
  </done>
</task>
