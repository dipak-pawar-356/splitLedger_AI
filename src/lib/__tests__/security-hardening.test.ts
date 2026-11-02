import { describe, it, expect, beforeEach } from "vitest";
import {
  canPerformGroupAction,
  hasPermission,
  sanitizeText,
  escapeHtml,
  sanitizePayload,
  validateUpload,
  sanitizeFilename,
  maskEmail,
  maskPhone,
  maskUPI,
  maskBankAccount,
  threatMonitor,
} from "@/lib/security";
import { escapeCsvValue } from "@/lib/export/export-engine";
import { isUserSystemAdmin } from "@/lib/auth";
import { handleError, ValidationError, ConflictError, ServerError } from "@/lib/errors";
import { assertRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

describe("Security Hardening & Enterprise Access Control (Part IV-C2)", () => {
  describe("SECTION 3 & 4: Granular Group RBAC Matrix", () => {
    it("should allow group owners to perform all administrative actions", () => {
      expect(canPerformGroupAction("owner", "group:delete")).toBe(true);
      expect(canPerformGroupAction("owner", "group:edit_settings")).toBe(true);
      expect(canPerformGroupAction("owner", "group:remove_members")).toBe(true);
      expect(canPerformGroupAction("owner", "expense:create")).toBe(true);
    });

    it("should restrict admins from deleting groups while allowing management", () => {
      expect(canPerformGroupAction("admin", "group:delete")).toBe(false);
      expect(canPerformGroupAction("admin", "group:edit_settings")).toBe(true);
      expect(canPerformGroupAction("admin", "group:remove_members")).toBe(true);
      expect(canPerformGroupAction("admin", "expense:create")).toBe(true);
    });

    it("should restrict members from group configuration changes", () => {
      expect(canPerformGroupAction("member", "group:delete")).toBe(false);
      expect(canPerformGroupAction("member", "group:edit_settings")).toBe(false);
      expect(canPerformGroupAction("member", "group:remove_members")).toBe(false);
      expect(canPerformGroupAction("member", "expense:create")).toBe(true);
      expect(canPerformGroupAction("member", "reports:view")).toBe(true);
    });

    it("should restrict viewers and guests to read-only views", () => {
      expect(canPerformGroupAction("viewer", "expense:create")).toBe(false);
      expect(canPerformGroupAction("viewer", "reports:view")).toBe(true);
      expect(canPerformGroupAction("guest", "expense:create")).toBe(false);
      expect(canPerformGroupAction("guest", "group:invite_members")).toBe(false);
    });

    it("should maintain app-level RBAC backward compatibility", () => {
      expect(hasPermission("user", "transactions:read")).toBe(true);
      expect(hasPermission("user", "admin:dashboard")).toBe(false);
      expect(hasPermission("superadmin", "admin:settings")).toBe(true);
    });
  });

  describe("SECTION 8 & 10: Defensive Input Sanitization & Anti-XSS", () => {
    it("should neutralize <script> tags and javascript: URIs", () => {
      const malicious = '<script>alert("XSS")</script>Dinner with team';
      expect(sanitizeText(malicious)).toBe("Dinner with team");

      const jsUri = 'javascript:evil()';
      expect(sanitizeText(jsUri)).toBe("evil()");
    });

    it("should neutralize DOM event handlers like onerror and onload", () => {
      const malicious = '<img src=x onerror="alert(1)"> Goa Hotel';
      const clean = sanitizeText(malicious);
      expect(clean).not.toContain("onerror");
    });

    it("should safely escape HTML entities", () => {
      const input = `<script>foo & bar "quotes" 'single'</script>`;
      const escaped = escapeHtml(input);
      expect(escaped).toContain("&lt;script&gt;");
      expect(escaped).toContain("&amp;");
      expect(escaped).toContain("&quot;");
      expect(escaped).toContain("&#x27;");
    });

    it("should recursively sanitize nested payload objects", () => {
      const payload = {
        title: "<script>alert(1)</script>Flight Tickets",
        notes: "Trip expenses",
        metadata: {
          comment: '<a href="javascript:steal()">Click here</a>',
        },
      };

      const sanitized = sanitizePayload(payload);
      expect(sanitized.title).toBe("Flight Tickets");
      expect(sanitized.metadata.comment).not.toContain("javascript:");
    });
  });

  describe("SECTION 12: Secure File Uploads", () => {
    it("should block executable files and scripts", () => {
      const result = validateUpload({
        name: "virus.exe",
        size: 1024,
        type: "application/octet-stream",
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Executable file extension");
    });

    it("should reject disallowed MIME types", () => {
      const result = validateUpload({
        name: "test.zip",
        size: 1024,
        type: "application/zip",
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Unsupported MIME type");
    });

    it("should sanitize path traversal attempts in filenames", () => {
      const clean = sanitizeFilename("../../etc/passwd");
      expect(clean).not.toContain("..");
      expect(clean).not.toContain("/");
    });

    it("should accept valid receipt images within size limit", () => {
      const result = validateUpload({
        name: "taj_dinner_receipt.jpg",
        size: 2 * 1024 * 1024, // 2MB
        type: "image/jpeg",
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe("SECTION 18 & 19: PII Data Protection & DPDP Compliance", () => {
    it("should mask email addresses correctly", () => {
      expect(maskEmail("dipak.pawar@example.com")).toBe("d****r@example.com");
      expect(maskEmail("ab@test.com")).toBe("a*@test.com");
      expect(maskEmail(null)).toBe("—");
    });

    it("should mask phone numbers correctly", () => {
      expect(maskPhone("+919876543210")).toBe("+91 ****** 3210");
      expect(maskPhone(null)).toBe("—");
    });

    it("should mask UPI IDs correctly", () => {
      expect(maskUPI("dipakpawar@okaxis")).toBe("dip****@okaxis");
      expect(maskUPI(null)).toBe("—");
    });

    it("should mask bank account numbers showing last 4 digits only", () => {
      expect(maskBankAccount("123456789012")).toBe("XXXXXXXX9012");
      expect(maskBankAccount(null)).toBe("—");
    });
  });

  describe("SECTION 21: Security Threat & Anomaly Detection", () => {
    beforeEach(() => {
      threatMonitor.clear();
    });

    it("should record security incident events and filter by severity", () => {
      threatMonitor.recordEvent({
        type: "failed_login",
        severity: "medium",
        details: "Multiple failed attempts from IP 192.168.1.1",
      });

      threatMonitor.recordEvent({
        type: "privilege_escalation",
        severity: "critical",
        details: "Non-admin attempted group deletion",
      });

      const events = threatMonitor.getRecentEvents();
      expect(events.length).toBe(2);

      const criticalEvents = threatMonitor.getRecentEvents({ severity: "critical" });
      expect(criticalEvents.length).toBe(1);
      expect(criticalEvents[0].type).toBe("privilege_escalation");
    });
  });

  describe("SECTION 22: CSV / Spreadsheet Formula Injection Prevention (CWE-1236)", () => {
    it("should prepend single quote to neutralize executable formula prefixes", () => {
      expect(escapeCsvValue("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(escapeCsvValue("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
      expect(escapeCsvValue("-1+1")).toBe("'-1+1");
      expect(escapeCsvValue("@import")).toBe("'@import");
      expect(escapeCsvValue("\tcalc")).toBe("'\tcalc");
      expect(escapeCsvValue("\rcalc")).toBe("'\rcalc");
    });

    it("should safely quote values containing commas or newlines without altering safe strings", () => {
      expect(escapeCsvValue("Grocery, vegetables")).toBe('"Grocery, vegetables"');
      expect(escapeCsvValue("Dinner at Taj")).toBe("Dinner at Taj");
      expect(escapeCsvValue(null)).toBe("");
      expect(escapeCsvValue(undefined)).toBe("");
    });
  });

  describe("SECTION 23: Centralized System Admin Authorization", () => {
    it("should verify admin status based on verified email and ADMIN_EMAILS environment variable", () => {
      const regularUser = { id: 10, email: "john@example.com" };
      expect(isUserSystemAdmin(regularUser)).toBe(false);

      // Default hardcoded backup admin or configured admin email
      const adminUser = { id: 1, email: "dipak@splitledger.ai" };
      expect(isUserSystemAdmin(adminUser)).toBe(true);

      expect(isUserSystemAdmin(null)).toBe(false);
      expect(isUserSystemAdmin({ id: 2, email: "" })).toBe(false);
    });
  });

  describe("SECTION 24: Error Masking & Information Leakage Prevention", () => {
    it("should sanitize database unique constraint errors without leaking table schemas", () => {
      const rawDbError = new Error("unique constraint 'users_email_unique' failed on schema public");
      const handled = handleError(rawDbError);

      expect(handled).toBeInstanceOf(ConflictError);
      expect(handled.message).toBe("A record with these details already exists.");
      expect(handled.message).not.toContain("users_email_unique");
      expect(handled.message).not.toContain("public");
    });

    it("should sanitize foreign key constraint errors", () => {
      const rawDbError = new Error("foreign key constraint 'fk_group_id' violated");
      const handled = handleError(rawDbError);

      expect(handled).toBeInstanceOf(ValidationError);
      expect(handled.message).toBe("Invalid reference to related data.");
      expect(handled.message).not.toContain("fk_group_id");
    });

    it("should mask unexpected errors with generic message while maintaining correlation ID", () => {
      const unexpectedError = new Error("Connection lost to pg-pool-east.internal:5432 with password red*****");
      const handled = handleError(unexpectedError);

      expect(handled).toBeInstanceOf(ServerError);
      expect(handled.message).toBe("An unexpected server error occurred.");
      expect(handled.message).not.toContain("5432");
      expect(handled.correlationId).toBeDefined();
    });
  });

  describe("SECTION 25: Action & Mutation Rate Limiting", () => {
    const testId = `test_rate_user_${Date.now()}`;

    beforeEach(() => {
      resetRateLimit(testId);
    });

    it("should allow calls within limit and block when threshold is exceeded", () => {
      const config = { limit: 3, windowMs: 10000 };

      expect(() => assertRateLimit(testId, config)).not.toThrow();
      expect(() => assertRateLimit(testId, config)).not.toThrow();
      expect(() => assertRateLimit(testId, config)).not.toThrow();

      expect(() => assertRateLimit(testId, config)).toThrow(ValidationError);
      expect(() => assertRateLimit(testId, config)).toThrow(/Too many requests/);
    });
  });
});
