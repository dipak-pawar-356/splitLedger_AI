/**
 * Data Protection, Privacy & Compliance Utilities (GDPR, CCPA, DPDP India)
 */

/**
 * Mask email address for privacy display (e.g. j***n@example.com)
 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "—";

  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }

  const first = local[0];
  const last = local[local.length - 1];
  const masked = "*".repeat(Math.min(4, local.length - 2));

  return `${first}${masked}${last}@${domain}`;
}

/**
 * Mask mobile number for privacy (e.g. +91 ****** 43210)
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";

  const clean = phone.replace(/[^0-9+]/g, "");
  if (clean.length <= 4) return "****";

  const visibleEnd = clean.slice(-4);
  const prefix = clean.startsWith("+") ? clean.slice(0, 3) : "";

  return `${prefix} ****** ${visibleEnd}`.trim();
}

/**
 * Mask UPI ID for privacy (e.g. user****@okaxis)
 */
export function maskUPI(upiId?: string | null): string {
  if (!upiId || !upiId.includes("@")) return "—";

  const [handle, bank] = upiId.split("@");
  if (handle.length <= 3) {
    return `${handle[0]}***@${bank}`;
  }

  return `${handle.slice(0, 3)}****@${bank}`;
}

/**
 * Mask Bank Account Number (e.g. XXXXXXXX5678)
 */
export function maskBankAccount(accountNumber?: string | null): string {
  if (!accountNumber) return "—";

  const clean = accountNumber.replace(/\s+/g, "");
  if (clean.length <= 4) return "XXXX";

  const last4 = clean.slice(-4);
  return `XXXXXXXX${last4}`;
}
