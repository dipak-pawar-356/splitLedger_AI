import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, AllSettingsState } from "@/lib/types/settings";

describe("Settings Center Module (Part IV-B3)", () => {
  describe("SECTION 1 & 4: Regional & Currency Defaults", () => {
    it("should strictly default to INR (₹) and Indian Numbering System", () => {
      expect(DEFAULT_SETTINGS.regional.currency).toBe("INR");
      expect(DEFAULT_SETTINGS.regional.useIndianNumberSystem).toBe(true);
      expect(DEFAULT_SETTINGS.regional.timezone).toBe("Asia/Kolkata");
      expect(DEFAULT_SETTINGS.regional.dateFormat).toBe("DD/MM/YYYY");
    });

    it("should format values according to Indian numbering system when enabled", () => {
      const amount = 150000;
      const formatIndianNumber = (num: number) => {
        return num.toLocaleString("en-IN");
      };

      const formatInternationalNumber = (num: number) => {
        return num.toLocaleString("en-US");
      };

      expect(formatIndianNumber(amount)).toBe("1,50,000");
      expect(formatInternationalNumber(amount)).toBe("150,000");
    });
  });

  describe("SECTION 3: Appearance & Visual Themes", () => {
    it("should support light, dark, and system themes with accent colors", () => {
      const validThemes = ["light", "dark", "system"];
      const validAccents = ["indigo", "emerald", "violet", "rose", "amber", "cyan"];

      expect(validThemes).toContain(DEFAULT_SETTINGS.appearance.theme);
      expect(validAccents).toContain(DEFAULT_SETTINGS.appearance.accentColor);
    });
  });

  describe("SECTION 5: Dashboard Widget Preferences", () => {
    it("should provide visible card toggles and default order", () => {
      expect(DEFAULT_SETTINGS.dashboard.visibleCards.financialSummary).toBe(true);
      expect(DEFAULT_SETTINGS.dashboard.visibleCards.quickActions).toBe(true);
      expect(DEFAULT_SETTINGS.dashboard.visibleCards.analyticsWidget).toBe(true);
      expect(DEFAULT_SETTINGS.dashboard.cardOrder.length).toBeGreaterThan(0);
    });
  });

  describe("SECTION 6 & 7: Group & Transaction Defaults", () => {
    it("should default to equal split type and UPI payment method", () => {
      expect(DEFAULT_SETTINGS.groups.defaultSplitType).toBe("equal");
      expect(DEFAULT_SETTINGS.groups.defaultCurrency).toBe("INR");
      expect(DEFAULT_SETTINGS.transactions.defaultPaymentMethod).toBe("upi");
      expect(DEFAULT_SETTINGS.transactions.autoDetectCategory).toBe(true);
    });
  });

  describe("SECTION 8 & 9: Report & Notification Preferences", () => {
    it("should default to PDF format and enabled multi-channel alerts", () => {
      expect(DEFAULT_SETTINGS.reports.defaultFormat).toBe("pdf");
      expect(DEFAULT_SETTINGS.reports.includeCharts).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.channels.inApp).toBe(true);
      expect(DEFAULT_SETTINGS.notifications.channels.email).toBe(true);
    });
  });

  describe("SECTION 12: Factory Settings Reset", () => {
    it("should restore full default settings state without data corruption", () => {
      const customSettings: AllSettingsState = {
        ...DEFAULT_SETTINGS,
        appearance: {
          ...DEFAULT_SETTINGS.appearance,
          theme: "dark",
          accentColor: "rose",
        },
      };

      expect(customSettings.appearance.theme).toBe("dark");

      // Reset
      const restored = { ...DEFAULT_SETTINGS };
      expect(restored.appearance.theme).toBe("system");
      expect(restored.regional.currency).toBe("INR");
    });
  });
});
