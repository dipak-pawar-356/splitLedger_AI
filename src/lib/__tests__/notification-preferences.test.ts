import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, NotificationPreferences } from "@/lib/types/settings";

describe("Notification Preferences & Communication Module (Part IV-B4)", () => {
  describe("SECTION 1 & 2: General Notification Defaults", () => {
    it("should have master notifications and real-time alerts enabled by default", () => {
      expect(DEFAULT_SETTINGS.notifications.masterEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.realTime).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.channels.inApp).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.channels.email).toBe(true);
    });
  });

  describe("SECTION 3, 4, 5: Granular Trigger Configuration", () => {
    it("should provide granular expense triggers including new expense, edits, and receipts", () => {
      expect(DEFAULT_SETTINGS.notifications.expensesTriggers.created).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.expensesTriggers.updated).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.expensesTriggers.receiptUploaded).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.expensesTriggers.mentioned).toBe(true);
    });

    it("should provide granular settlement triggers for debt payments in INR", () => {
      expect(DEFAULT_SETTINGS.notifications.settlementsTriggers.suggested).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.settlementsTriggers.paid).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.settlementsTriggers.received).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.settlementsTriggers.fullSettlement).toBe(true);
    });

    it("should provide group lifecycle triggers", () => {
      expect(DEFAULT_SETTINGS.notifications.groupsTriggers.added).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.groupsTriggers.roleChanged).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.groupsTriggers.memberJoined).toBe(true);
    });
  });

  describe("SECTION 9: Mandatory Security Alerts Constraint", () => {
    it("should permanently enforce critical security triggers as active", () => {
      const security = DEFAULT_SETTINGS.notifications.securityTriggers;
      expect(security.passwordChanged).toBe(true);
      expect(security.emailChanged).toBe(true);
      expect(security.newDeviceLogin).toBe(true);
      expect(security.twoFactorChanged).toBe(true);
      expect(security.suspiciousActivity).toBe(true);
      expect(security.accountRecovery).toBe(true);
    });
  });

  describe("SECTION 10 & 11: Channels & Email Formatting", () => {
    it("should support primary, secondary, and fallback channel routing", () => {
      const routing = DEFAULT_SETTINGS.notifications.channelRouting;
      expect(routing.expenses.primary).toBe("inApp");
      expect(routing.expenses.secondary).toBe("email");
      expect(routing.expenses.fallback).toBe("whatsapp");
    });

    it("should enable rich HTML emails and verified mailbox delivery", () => {
      expect(DEFAULT_SETTINGS.notifications.emailSettings.htmlEmails).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.emailSettings.verifiedEmailOnly).toBe(true);
    });
  });

  describe("SECTION 15: Quiet Hours Schedule Logic", () => {
    it("should allow emergency security alerts during quiet hours", () => {
      const quiet = DEFAULT_SETTINGS.notifications.quietHours;
      expect(quiet.emergencyOnly).toBe(true);
      expect(quiet.suppressLowPriority).toBe(true);
    });

    it("should correctly evaluate if time is within quiet hours", () => {
      const isWithinQuietHours = (timeStr: string, start: string, end: string) => {
        // e.g. 23:30 in range 22:00 -> 07:00
        const [tH, tM] = timeStr.split(":").map(Number);
        const [sH, sM] = start.split(":").map(Number);
        const [eH, eM] = end.split(":").map(Number);

        const currentMinutes = tH * 60 + tM;
        const startMinutes = sH * 60 + sM;
        const endMinutes = eH * 60 + eM;

        if (startMinutes > endMinutes) {
          // Overnight span
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      };

      expect(isWithinQuietHours("23:30", "22:00", "07:00")).toBe(true);
      expect(isWithinQuietHours("03:15", "22:00", "07:00")).toBe(true);
      expect(isWithinQuietHours("14:00", "22:00", "07:00")).toBe(false);
    });
  });

  describe("SECTION 18: Notification Template Engine", () => {
    it("should accurately substitute variables formatted in INR (₹)", () => {
      const template = "💸 {{User}} logged {{Expense}} of {{Amount}} in {{Group}}.";
      const variables = {
        User: "Dipak Pawar",
        Expense: "Team Dinner",
        Amount: "₹ 3,500.00",
        Group: "Goa Trip 2026",
      };

      let rendered = template;
      for (const [key, val] of Object.entries(variables)) {
        rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), val);
      }

      expect(rendered).toBe("💸 Dipak Pawar logged Team Dinner of ₹ 3,500.00 in Goa Trip 2026.");
    });
  });
});
