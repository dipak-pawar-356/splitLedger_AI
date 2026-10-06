import { describe, it, expect } from "vitest";
import { 
  generateTransactionId, 
  generateVersionId, 
  generateAuditId, 
  formatCurrency 
} from "../utils";

describe("Transaction ID Generator", () => {
  it("should generate public IDs with 'txn_' prefix", () => {
    const txnId = generateTransactionId();
    expect(txnId).toMatch(/^txn_[A-Za-z0-9]{16}$/);
    expect(txnId.length).toBeGreaterThanOrEqual(16);
  });

  it("should generate URL-safe, non-sequential and unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = generateTransactionId();
      expect(id).not.toMatch(/[+/=]/); // No unsafe URL characters
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
    expect(ids.size).toBe(100);
  });

  it("should generate version IDs with 'ver_' prefix", () => {
    const verId = generateVersionId();
    expect(verId).toMatch(/^ver_[A-Za-z0-9]{16}$/);
  });

  it("should generate audit log IDs with 'aud_' prefix", () => {
    const audId = generateAuditId();
    expect(audId).toMatch(/^aud_[A-Za-z0-9]{16}$/);
  });

  it("should format currency in INR (₹) standard", () => {
    const formatted = formatCurrency(1250.5);
    expect(formatted).toContain("1,250.50");
    // Standard Indian Rupee symbol check
    expect(formatted).toMatch(/₹|INR/);
  });
});
