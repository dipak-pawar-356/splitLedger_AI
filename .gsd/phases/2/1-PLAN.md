---
phase: 2
plan: 1
wave: 1
gap_closure: false
---

# Plan 2.1: Secure Offline UPI QR Engine & Parameter Sanitizer

## Objective
Upgrade `src/lib/payments/upi.ts` to use local high-resolution QR rendering with `qrcode` package (generating Data URLs and SVGs) instead of external third-party API queries. Enforce strict parameter sanitization ensuring only standard UPI parameters (`pa`, `pn`, `am`, `cu`, `tn`, `tr`) are encoded, with zero sensitive user leaks.

## Context
- `src/lib/payments/upi.ts`
- `package.json`

## Tasks

<task type="auto">
  <name>Build In-App Dynamic QR Code Generator</name>
  <files>
    src/lib/payments/upi.ts
  </files>
  <action>
    1. Import `QRCode` from "qrcode".
    2. Add `generateUpiQrCodeDataUrl(upiUri: string, options?: { width?: number; margin?: number }): Promise<string>`.
    3. Add `generateUpiQrCodeSvg(upiUri: string, options?: { width?: number; margin?: number }): Promise<string>`.
    4. Maintain backward compatibility with `generateUpiQrCodeUrl` but prefer local generation.
    5. Enhance `buildUpiDeepLink` to ensure amount is strictly rounded and formatted to 2 decimals, currency defaults to INR, and payee UPI ID and name are sanitized.
  </action>
  <verify>
    npx vitest run src/lib/payments or tsc --noEmit
  </verify>
  <done>
    QR codes generate locally without external network requests; NPCI standard URI formatted cleanly.
  </done>
</task>
